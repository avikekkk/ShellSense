// Every tool lives in its own module and exposes a class with:
//   constructor(extension, settings)  - build UI / start timers
//   destroy()                         - undo everything the constructor did
// `key` is the boolean GSettings key that toggles the tool on/off.
// `keepWhenLocked`: keep running on the lock screen (everything else is
// stopped while locked and restarted on unlock).

import {AppGridSortTool} from './appGridSort.js';
import {AppGridTwoLineTool} from './appGridTwoLine.js';
import {CaffeineTool} from './caffeine.js';
import {ClipboardTool} from './clipboard.js';
import {ColorPickerTool} from './colorPicker.js';
import {HideActivitiesTool} from './hideActivities.js';
import {NetSpeedTool} from './netSpeed.js';

export const TOOLS = [
    {id: 'net-speed', key: 'net-speed-enabled', Tool: NetSpeedTool},
    {id: 'app-grid-sort', key: 'app-grid-sort-enabled', Tool: AppGridSortTool},
    {id: 'app-grid-two-line', key: 'app-grid-two-line-enabled', Tool: AppGridTwoLineTool},
    {id: 'caffeine', key: 'caffeine-enabled', Tool: CaffeineTool},
    // Keeps recording while locked so the history isn't wiped on every lock.
    {id: 'clipboard', key: 'clipboard-enabled', Tool: ClipboardTool, keepWhenLocked: true},
    {id: 'color-picker', key: 'color-picker-enabled', Tool: ColorPickerTool},
    {id: 'hide-activities', key: 'hide-activities-enabled', Tool: HideActivitiesTool},
];
