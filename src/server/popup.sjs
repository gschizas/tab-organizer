// TODO lots of Chromeisms in here

@ = require([
  { id: "sjs:sequence" },
  { id: "./extension/main" },
  { id: "./options" },
  { id: "./util/observe" }
])

/*
 !         -> tab     (opens tab)
 !         -> popup   (gets size, opens popup)
 !         -> sidebar (gets size, opens popup, resizes windows)
 !         -> bubble  (opens bubble)

 ! tab     -> tab     (focuses tab + window)
 ! popup   -> popup   (focuses popup)
 ! sidebar -> sidebar (focuses popup, resizes windows)
 ! bubble  -> bubble  (not possible, probably closes bubble)

 ! tab     ->         (nothing)
 ! popup   ->         (nothing)
 ! sidebar ->         (unresizes windows)
 ! bubble  ->         (nothing)

 ! tab     -> popup   (closes tab, opens popup)
 ! tab     -> sidebar (closes tab, opens popup, resizes windows)
 ! tab     -> bubble  (closes tab, opens bubble)

 ! popup   -> tab     (closes popup, opens tab)
 ! popup   -> sidebar (moves popup , resizes windows)
 ! popup   -> bubble  (closes popup, opens bubble)

 ! sidebar -> tab     (closes popup, unresizes windows, opens tab)
 ! sidebar -> popup   (moves popup , unresizes windows)
 ! sidebar -> bubble  (closes popup, unresizes windows, opens bubble)

 ! bubble  -> tab     (closes bubble?, opens tab)
 ! bubble  -> popup   (closes bubble?, opens popup)
 ! bubble  -> sidebar (closes bubble?, opens popup, resizes windows)


 current-type   -> new-type

 tab            -> tab             (focus tab)
 popup,sidebar  -> popup,sidebar   (focus popup)

 tab            -> !tab            (close tab)
 !tab           -> tab             (open tab)

 popup,sidebar  -> !popup,sidebar  (close popup)
 !popup,sidebar -> popup,sidebar   (open popup)

 tab            -> bubble          (close tab)
 popup,sidebar  -> bubble          (close popup)
 sidebar        -> bubble          (unresizes windows)

 sidebar        ->                 (unresizes windows)
 sidebar        -> !sidebar        (unresizes windows)
 *              -> sidebar         (resizes windows)

 */
exports.init = function () {
  var avail = {
    left:    @cache("screen.available.left"),
    top:     @cache("screen.available.top"),
    width:   @cache("screen.available.width"),
    height:  @cache("screen.available.height"),
    checked: @cache("screen.available.checked")
  }

  function checkMonitor() {
    // TODO force or not (see extension/chrome/windows.getMaximumSize)?
    var size = @windows.getMaximumSize(false)
    avail.left.set(size.left)
    avail.top.set(size.top)
    avail.width.set(size.width)
    avail.height.set(size.height)
    avail.checked.set(true)
    return size
  }

  function getSize() {
    if (avail.checked.get()) {
      return {
        left:   avail.left.get(),
        top:    avail.top.get(),
        width:  avail.width.get(),
        height: avail.height.get()
      }
    } else {
      return checkMonitor()
    }
  }

  // TODO test this
  @connection.on.command("get-monitor-size", function () {
    checkMonitor()
  })


  var type = @opt("popup.type")

  var popup_url = "panel.html"

  var state = {
    tab:   null,
    popup: null,
    type:  null,
    size:  null
  }

  function openPopup(size) {
    if (state.popup === null) {
      var o    = {}
      o.url    = popup_url
      o.left   = size.left
      o.top    = size.top
      o.width  = size.width
      o.height = size.height
      state.popup = @popup.open(o)
    } else {
      @popup.move(state.popup, size)
    }
  }

  function makeTab() {
    if (state.tab === null) {
      state.tab = @tabs.open({ url: popup_url })
    } else {
      @tabs.focus(state.tab)
    }
  }

  function toAll(f) {
    @windows.getCurrent() ..@each(function (x) {
      f(x)
    })
  }

  function resizeWindow(w) {
    @assert.is(state.type, "sidebar")
    @assert.is(state.tab, null)
    @assert.isNot(state.popup, null)
    @assert.isNot(state.size, null)
    @windows.move(w, state.size.window)
  }

  function unresizeWindow(w) {
    @assert.is(state.type, "sidebar")
    @assert.is(state.tab, null)
    @assert.isNot(state.popup, null)
    @assert.isNot(state.size, null)
    @windows.maximize(w)
  }

  function unresizeSidebar() {
    @assert.is(state.type, "sidebar")
    @assert.is(state.tab, null)
    @assert.isNot(state.popup, null)
    @assert.isNot(state.size, null)
    toAll(unresizeWindow)
    state.size = null
  }

  function removeAll() {
    if (state.popup !== null) {
      @assert.ok(state.type === "popup" || state.type === "sidebar")
      @assert.is(state.tab, null)

      @popup.close(state.popup)

    } else if (state.tab !== null) {
      @assert.is(state.type, "tab")
      @assert.is(state.popup, null)

      @tabs.close(state.tab)
    }

    @assert.is(state.tab, null)
    @assert.is(state.popup, null)
    @assert.is(state.size, null)
    @assert.is(state.type, null)
  }

  function getDimensions(pos) {
    var width = @opt("size.sidebar").get()
      , dir   = @opt("size.sidebar.position").get()

    // TODO assert that dir is left, right, top, or bottom
    return {
      sidebar: {
        left:   (dir === "right"
                  ? pos.left + pos.width - width
                  : pos.left),
        top:    (dir === "bottom"
                  ? pos.top + pos.height - width
                  : pos.top),
        width:  (dir === "left" || dir === "right"
                  ? width
                  : pos.width),
        height: (dir === "top" || dir === "bottom"
                  ? width
                  : pos.height)
      },

      window: {
        left:   (dir === "left"
                  ? pos.left + width
                  : pos.left),
        top:    (dir === "top"
                  ? pos.top + width
                  : pos.top),
        width:  (dir === "left" || dir === "right"
                  ? pos.width - width
                  : pos.width),
        height: (dir === "top" || dir === "bottom"
                  ? pos.height - width
                  : pos.height)
      }
    }
  }

  function openPopup() {
    var type_new = type.get()
    var type_old = state.type

    state.type = type_new

    if (type_new === "popup") {
      if (type_old !== null && type_old !== "popup") {
        if (type_old === "sidebar") {
          unresizeSidebar()
        } else {
          removeAll()
        }
      }

      var size   = getSize()
        , left   = @opt("size.popup.left").get()
        , top    = @opt("size.popup.top").get()
        , width  = @opt("size.popup.width").get()
        , height = @opt("size.popup.height").get()

      makePopup({
        left:   size.left + (size.width  * left) - (width  * left),
        top:    size.top  + (size.height * top)  - (height * top),
        width:  width,
        height: height
      })
      console.log("popup created")

      @assert.isNot(state.popup, null)
      @popup.focus(state.popup) // TODO is this a good idea ?
      console.log("popup focused")

    } else if (type_new === "sidebar") {
      if (type_old !== null && type_old !== "sidebar") {
        @assert.is(state.size, null)

        if (type_old === "popup") {
          @assert.is(state.tab, null)
          @assert.isNot(state.popup, null)
        } else {
          removeAll()
        }
      }

      state.size = getDimensions(getSize())
      console.log(state.size)

      makePopup(state.size.sidebar)
      toAll(resizeWindow)
      console.log("popup created")

      @assert.isNot(state.popup, null)
      @popup.focus(state.popup) // TODO is this a good idea ?
      console.log("popup focused")

    } else if (type_new === "tab") {
      if (type_old !== null && type_old !== "tab") {
        // TODO is this necessary, or does removeAll take care of it ?
        /*if (type_old === "sidebar") {
          unresizeSidebar()
        }*/
        removeAll()
        @assert.is(state.popup, null)
        @assert.is(state.type, null)
        @assert.is(state.size, null)
      }

      makeTab()

    } else {
      @assert.fail()
    }
  }

  type ..@observe(function (type) {
    if (type === "bubble") {
      @button.setURL(popup_url)
    } else {
      // TODO I don't like that setting the URL to "" disables it
      @button.setURL("")
    }
  })

  @button.on.clicked ..@listen(function () {
    console.log("CLICKED BUTTON")
    openPopup()
  })

  @windows.on.add ..@listen(function (info) {
    var window = info.window
    if (state.type === "sidebar") {
      @assert.is(state.tab, null)
      @assert.isNot(state.popup, null)
      @assert.isNot(state.size, null)
      resizeWindow(window)
    }
  })

  @popup.on.closed ..@listen(function (info) {
    var popup = info.popup
    console.log("popup.closed", state.popup, popup)
    if (state.popup !== null && state.popup.id === popup.id) {
      @assert.isNot(state.type, null)
      @assert.is(state.tab, null)

      if (state.type === "sidebar") {
        unresizeSidebar()
      } else {
        @assert.is(state.type, "popup")
        @assert.is(state.size, null)
      }

      state.popup = null
      state.type = null
    }
  })

  @tabs.on.remove ..@listen(function (info) {
    var tab = info.tab
    console.log("tab.remove", state.tab, tab)
    if (state.tab !== null && state.tab.id === tab.id) {
      @assert.is(state.type, "tab")
      @assert.is(state.popup, null)
      @assert.is(state.size, null)

      state.tab = null
      state.type = null
    }
  })

  console.info("popup: finished")
}
