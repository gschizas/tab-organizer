import * as dom from "../../dom";
import { async } from "../../../util/async";
import { always } from "../../../util/mutable/ref";
import { init as init_group } from "./group";
import { init as init_options } from "../../sync/options";


export const init = async(function* () {
  const { group: ui_group } = yield init_group;
  const { get: opt } = yield init_options;


  const style_group_list = dom.style({
    "padding": opt("groups.layout").map((x) => {
      switch (x) {
      case "horizontal":
        return "8px calc(190px + 8px + 1px) 8px 8px"
      default:
        return "3px 0px 0px 0px";
      }
    }),

    "overflow": always("auto"),

    "align-items": always("stretch"), // TODO hacky

    "justify-content": always("space-between"),

    // TODO hacky
    "background": always("inherit"),
  });


  const scroll_x = +(localStorage["popup.scroll.x"] || 0);
  const scroll_y = +(localStorage["popup.scroll.y"] || 0);


  const group_list = (groups) =>
    dom.row((e) => [
      e.set_style(dom.stretch, always(true)),
      e.set_style(style_group_list, always(true)),

      e.set_scroll({
        // TODO a little hacky
        x: always(scroll_x),
        // TODO a little hacky
        y: always(scroll_y)
      }),

      e.on_scroll(({ x, y }) => {
        localStorage["popup.scroll.x"] = "" + x;
        localStorage["popup.scroll.y"] = "" + y;
      }),

      e.children(groups.map(ui_group))
    ]);


  return { group_list };
});
