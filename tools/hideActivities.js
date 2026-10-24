// Hide the Activities button (the workspace dots at the top-left).
// The overview still opens with the Super key or the hot corner.

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export class HideActivitiesTool {
    constructor() {
        this._container = Main.panel.statusArea.activities.container;
        this._container.hide();
    }

    destroy() {
        this._container.show();
        this._container = null;
    }
}
