import "../css/popup.css";

import {setDefaultGroups} from "./actions/grouping-set-default";
import {triggerGroupingUx} from "./actions/grouping-trigger-ux";

const actions = {
    setDefaultGroups,
    triggerGroupingUx
};

document.addEventListener('DOMContentLoaded', function () {
    let btns = document.querySelectorAll('button.action');
    for (let i = 0; i < btns.length; i++) {
        btns[i].addEventListener('click', actions[btns[i].dataset.action]);
    }
});
