goog.provide("search")

goog.require("util.cell")
goog.require("util.array")
goog.require("util.object")
goog.require("util.string")
goog.require("util.log")
goog.require("util.re")
goog.require("cache")
goog.require("parse")

goog.scope(function () {
  var cell   = util.cell
    , array  = util.array
    , object = util.object
    , log    = util.log.log
    , assert = util.log.assert
    , re     = util.re

  function sortedKeys(o) {
    var aKeys = object.keys(o)
    array.sort(aKeys, util.string.upperSorter)
    return aKeys
  }

  function tester(name, o) {
    var keys = sortedKeys(o)
    return function (s) {
      if (s instanceof parse.String) {
        var test = re.make("^" + re.escape(s.value))
        // TODO util.array
        for (var i = 0, iLen = array.len(keys); i < iLen; ++i) {
          if (re.test(keys[i], test)) {
            return o[keys[i]]
          }
        }
      }
      var a = array.map(keys, function (x) {
        return "\n  " + name + ":" + x
      })
      throw new SyntaxError("expected any of" + array.join(a, "") + "\nbut got\n  " + name + ":" + s)
    }
  }

  /*function Lazy(f) {
    this.value = f
    this.cached = false
  }
  Lazy.prototype.get = function () {
    if (!this.cached) {
      this.value = this.value()
      this.cached = true
    }
    return this.value
  }*/

  var specials = {
    "is": tester("is", {
      "any": function () {
        return true
      },

      "bookmarked": (function () {
        // TODO have it make the tabs hidden, THEN get all the bookmarks, THEN do the search
        //var o = LUSH.bookmark.getAll()
        return function (x) {
          return x.url in o
        }
      })(),

      "broken": (function () {
        var r = [/^404 Not Found$/,
                 /^Oops! (?:Google Chrome could not |This link appears to be broken)/,
                 / is not available$/,
                 / failed to load$/]
        return function (x) {
          return array.some(r, function (r) {
            return re.test(x.title, r)
          })
        }
      })(),

      "image": (function () {
        var url   = /\.\w+(?=[#?]|$)/
          , title = /\(\d+×\d+\)$/
        return function (x) {
          return re.test(x.url, url) && re.test(x.title, title)
        }
      })(),

      "pinned": function (x) {
        return !!x.pinned
      },

      // TODO
      /*"selected": function (x) {
        return $.hasClass(x, "selected")
      },*/

      "unloaded": function (x) {
        return x.active == null
      }
    }),
    /* TODO move this elsewhere, probably platform.tabs
    "same": new Lazy(function () {
      var funcs = {
        // TODO
        "domain": function (x) {
          return x.location.domain
        },
        "file": function (x) {
          return x.location.domain + x.location.path + x.location.file
        },
        "path": function (x) {
          return x.location.domain + x.location.path
        },
        "title": function (x) {
          return x.title
        },
        "url": function (x) {
          return x.url
        }
      }

      var aKeys = object.keys(funcs)

      var types = {}

      var o = {}
      array.each(aKeys, function (s) {
        var f = funcs[s]
        o[s] = function (x) {
          return types[s][f(x)] >= 2
        }
      })

      function add(x) {
        array.each(aKeys, function (s) {
          var title = funcs[s](x)
            , o     = types[s]
          if (o[title] == null) {
            o[title] = 0
          }
          ++o[title]
        })
      }

      function rem(x) {
        object.each(funcs, function (f, s) {
          var title = f(x)
            , o     = types[s]
          assert(o[title] != null)
          assert(o[title] > 0)
          --o[title]
          if (o[title] === 0) {
            delete o[title]
          }
        })
      }

      // TODO inefficient
      cell.bind([tabs.all], function (o) {
        array.each(aKeys, function (s) {
          types[s] = {}
        })
        object.each(o, add)
        log("HIYA!!!")
      })

      cell.event([tabs.on.opened], add)
      cell.event([tabs.on.updated], add)
      cell.event([tabs.on.updatedOld], rem)
      cell.event([tabs.on.closed], rem)

      return tester("same", o)
    }),*/
    /*"has": function (self, test) {
      test = test()
      if (test("macro")) {
        return function (x) {

        }
      } else {
        throw new SyntaxError()
      }
    },*/
    "inurl": function (s) {
      var test = parse.compile1(s)
      return function (x) {
        return test(x.url)
      }
    },
    "intitle": function (s) {
      var test = parse.compile1(s)
      return function (x) {
        return test(x.title)
      }
    },
    "group": function (s) {
      var test = parse.compile1(s)
      return function (x) {
        var b = false
        // TODO inefficient
        object.each(x.groups, function (_, s) {
          if (test(s)) {
            b = true
          }
        })
        return b
      }
    }
    /*"group-tabs<=": function (test) {
      test = test(function (x) {
        return +x.regexp
      })
      if (typeof test !== "number") {
        console.log(test)
      } else {
        throw new SyntaxError()
      }
    }*/
  }

  parse.rule(":", {
    priority: 30,
    infix: parse.infix,
    compile: function (x) {
      var left  = x.left
        , right = x.right

      if (!(left instanceof parse.String) || specials[left.value] == null) {
        var a = array.map(sortedKeys(specials), function (x) {
          return "\n  " + x + ":"
        })
        throw new SyntaxError("expected any of" + array.join(a, "") + "\nbut got\n  " + left + ":")
      }

      var f = specials[left.value]

      return (function anon(x) {
        var left, right
        if (parse.is(x, ",")) {
          left  = anon(x.left)
          right = anon(x.right)
          return function (x) {
            return left(x) || right(x)
          }
        // TODO foo:-bar shouldn't be allowed anymore
        } else if (parse.is(x, "-")) {
          if (parse.is(x.right, ",")) {
            return anon(new parse.Infix(",", new parse.Prefix("-", x.right.left), x.right.right))
          } else {
            right = anon(x.right)
            return function (x) {
              return !right(x)
            }
          }
        } else {
          return f(x)
        }
      })(right)
    }
  })

  parse.rule(",", {
    priority: 30,
    infix: parse.infix,
    compile: function (x) {
      var left  = parse.compile(x.left)
        , right = parse.compile(x.right)
      return function (tab) {
        return left(tab) || right(tab)
      }
    }
  })

  // TODO foo:-bar shouldn't be allowed anymore, so this should probably be higher priority ?
  parse.rule("-", {
    priority: 30,
    prefix: parse.prefixRight,
    compile: function (x) {
      var right = parse.compile(x.right)
      return function (tab) {
        return !right(tab)
      }
    }
  })

  parse.rule(" ", {
    priority: 20,
    infix: parse.infix,
    compile: function (x) {
      var left  = parse.compile(x.left)
        , right = parse.compile(x.right)
      return function (tab) {
        return left(tab) && right(tab)
      }
    }
  })

  parse.rule("|", {
    priority: 10,
    infix: parse.infix,
    compile: function (x) {
      var left  = parse.compile(x.left)
        , right = parse.compile(x.right)
      return function (tab) {
        return left(tab) || right(tab)
      }
    }
  })

  parse.braces("(", ")")

  search.loaded = cell.dedupe(false)

  cell.when(cache.loaded, function () {
    var parsed = cell.bind([cache.get("search.last")], function (s) {
      try {
        return { value: parse.parse(s) }
      } catch (e) {
        return { error: e["message"] || "" }
      }
    })

    search.error = cell.bind([parsed], function (s) {
      if (s.error != null) {
        return s.error
      } else {
        return false
      }
    })

    search.value = cell.bind([parsed], function (s) {
      if (s.value != null) {
        return s.value
      } else {
        return false
      }
    })

    /*function check(f, x) {
      if (f == null) {
        x.visible.set(true)
      } else {
        x.visible.set(f(x))
      }
    }

    function wrap(o) {
      var r = cell.value(o.get())
      cell.event([o], function (x) {
        check(compiled.get(), x)
        r.set(x)
      })
      return r
    }

    tabs.on.opened     = wrap(tabs.on.opened)
    tabs.on.updated    = wrap(tabs.on.updated)
    tabs.on.focused    = wrap(tabs.on.focused)
    tabs.on.unfocused  = wrap(tabs.on.unfocused)
    tabs.on.selected   = wrap(tabs.on.selected)
    tabs.on.deselected = wrap(tabs.on.deselected)*/

    search.loaded.set(true)
  })
})
