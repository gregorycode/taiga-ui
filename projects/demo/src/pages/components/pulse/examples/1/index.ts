import {Component, signal} from '@angular/core';
import {changeDetection} from '@demo/emulate/change-detection';
import {encapsulation} from '@demo/emulate/encapsulation';
import {TuiInfiniteScroll} from '@taiga-ui/core';
import {TuiAutoColorPipe} from '@taiga-ui/kit';

@Component({
    imports: [TuiAutoColorPipe, TuiInfiniteScroll],
    templateUrl: './index.html',
    styleUrl: './index.less',
    encapsulation,
    changeDetection,
})
export default class Example {
    protected readonly index = signal(0);
}
