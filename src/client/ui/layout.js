// TODO grid mode is incorrect, should calculate everything in JS
goog.provide("ui.layout")

goog.require("util.dom")
goog.require("util.cell")
goog.require("util.log")
goog.require("util.object")
goog.require("util.array")
goog.require("util.math")
goog.require("opt")

goog.scope(function () {
  var dom    = util.dom
    , cell   = util.cell
    , log    = util.log.log
    , fail   = util.log.fail
    , array  = util.array
    , object = util.object
    , math   = util.math

  ui.layout.visibleGroups = cell.dedupe(null)

  function styleLayout(e, o, layout) {
    if (layout in o) {
      e.styleWhen(o[layout], true)
      object.each(o, function (x, s) {
        if (s !== layout) {
          e.styleWhen(x, false)
        }
      })
    } else {
      object.each(o, function (x) {
        e.styleWhen(x, false)
      })
    }
  }

  function selector(o) {
    return function (e) {
      e.bind([opt.get("groups.layout")], function (layout) {
        styleLayout(e, o, layout)
      })
    }
  }

  ui.layout.group = selector({
    "vertical": dom.style(function (e) {
      e.styles(dom.clip)
      e.set("top", "-1px")
      e.set("border-top-width", "1px")
    }),
    "horizontal": dom.style(function (e) {
      e.styles(dom.stretch)

      e.set("background-color", "white") // TODO
      e.set("border-color", "dodgerblue")

      //e.set("box-shadow", "0px 0px 10px black")
      /*e.set("border-left-image", ui.gradient("to left", ["0%",   "black"],
                                                          ["100%", "transparent"]))*/

      //e.set("overflow", "hidden")

      //e.set("overflow", "hidden")
      //e.stretch(true)
      //e.set("left", "-2px")
      //e.set(["border-left-width", "border-right-width"], "2px")
      //e.set(["border-left-style", "border-right-style"], "groove")

      //e.set("max-width", "400px")
      e.set("padding-right", "10px")
      e.set("min-width", "120px")
      e.set("height", "100%")
      //e.set("padding-right", "20px")

      /*e.set("border-top-color", "dodgerblue")
        e.set("border-top-width", "2px")
        e.set("border-top-style", "groove")
        e.set("margin-top", "-15px")
        e.set("padding-top", "15px")*/
        //e.set("background-color", "inherit")
    }),
    "grid": dom.style(function (e) {
      e.styles(dom.grow)

      e.set("overflow", "hidden")
      //e.set("float", "left")
      //e.stretch(true)
      e.set("margin-bottom", "-1px")
      e.set("margin-left", "-1px")
      e.set("border-bottom-width", "1px")
      e.set("border-left-width", "1px")
      //e.set("border-width", "1px")

      //e.set("max-width",  "100%")
      //e.set("max-height", "100%")

      //e.set("align-items", "stretch")

      cell.when(opt.loaded, function () {
        cell.event([ui.layout.visibleGroups,
                    opt.get("groups.layout.grid.row"),
                    opt.get("groups.layout.grid.column")], function (a, iRow, iCol) {
          var iWidth  = array.len(a)
            , iHeight = math.ceil(iWidth / iCol)
          if (iWidth < iCol) {
            iHeight = 1
          } else if (iHeight < iRow) {
            iWidth  = iCol
          } else {
            iWidth  = iCol
            iHeight = iRow
          }
          e.set("width",  ((1 / iWidth)  * 100) + "%")
          e.set("height", ((1 / iHeight) * 100) + "%")
        })
      })
    })
  })

  ui.layout.groupFocused = selector({
    "horizontal": dom.style(function (e) {
      e.set("z-index", "2")
      //e.set("background-color", "green")
    })
  })

  ui.layout.groupLast = selector({
    "horizontal": dom.style(function (e) {
      //e.set("min-width", "400px")
    })
  })

  ui.layout.groupTop = selector({
    "horizontal": dom.style(function (e) {
      e.set("z-index", "1")

      e.set("background-color", "inherit")
      e.set("border-color", "inherit")

      e.set(["border-top-left-radius", "border-top-right-radius"], "5px")

      //e.set("left", "-2px")
      e.set(["border-left-width", "border-top-width", "border-right-width"], "5px")
      e.set(["border-left-style", "border-top-style"], "groove")
      e.set("border-right-style", "ridge")
      e.set("width", "100px")
    })
  })

  ui.layout.groupTopInner = selector({
    "horizontal": dom.style(function (e) {
      e.set("background-color", "inherit")
      e.set("border-radius", "inherit")
      e.set("padding-bottom", "1px")
    })
  })

  ui.layout.groupTabs = selector({
    "horizontal": dom.style(function (e) {
      e.set("background-color", "inherit")
      e.set("border-color", "inherit")

      e.set("border-width", "5px")
      e.set(["border-top-style",   "border-left-style"], "groove")
      e.set(["border-right-style", "border-bottom-style"], "ridge")

      e.set(["border-top-right-radius", "border-bottom-left-radius", "border-bottom-right-radius"], "5px")

      e.set("top", "-1px")

      e.set("overflow", "auto")
      e.set("width", "400px")
      e.set("height", dom.calc("100%", "-", "18px", "+", "1px"))
    }),
    "grid": dom.style(function (e) {
      e.set("overflow", "auto")
      e.set("width", "100%")
      e.set("height", dom.calc("100%", "-", "18px")) // TODO why is this hardcoded as 18px ?
      //e.set("height", "100%")
    })
  })

  ui.layout.groupList = selector({
    /*"vertical": dom.style(function (e) {
    }),*/
    "horizontal": dom.style(function (e) {
      e.styles(dom.horiz)
      e.set("padding", "20px")
    }),
    "grid": dom.style(function (e) {
      e.styles(dom.horiz)
      //e.set("align-items", "stretch")
      //e.set("align-content", "stretch")
      e.set("flex-wrap", "wrap")
      //e.set("width", dom.calc("100%", "-", "5px"))
    })
  })
})
