import {NgTemplateOutlet} from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    contentChild,
    input,
    model,
    signal,
    TemplateRef,
} from '@angular/core';
import {WaIntersectionObservee} from '@ng-web-apis/intersection-observer';
import {TuiScrollRef} from '@taiga-ui/core/components/scrollbar';

@Component({
    selector: 'tui-infinite-scroll',
    imports: [NgTemplateOutlet, WaIntersectionObservee],
    templateUrl: './infinite-scroll.component.html',
    styleUrl: './infinite-scroll.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
    hostDirectives: [TuiScrollRef],
    host: {'[class._initialized]': 'initialized()'},
})
export class TuiInfiniteScroll {
    protected readonly visible = new Map<number, boolean>();
    protected readonly template = contentChild.required(TemplateRef);
    protected readonly initialized = signal(false);
    protected readonly indices = computed(() =>
        Array.from(
            {length: this.buffer() * 2},
            (_, i) => this.index() - this.buffer() + i,
        ),
    );

    public readonly buffer = input(10);
    public readonly index = model(0);

    protected onIntersection(isIntersecting: boolean, index: number): void {
        this.visible.set(index, isIntersecting);
        console.log(
            Array.from(this.visible.keys()).filter((index) => this.visible.get(index)),
        );

        if (this.visible.size < this.buffer() * 2 - 1) {
            return;
        }

        console.log(
            Array.from(this.visible.keys())
                .filter((index) => this.visible.get(index))
                .sort((a, b) => a - b)[0],
        );

        this.initialized.set(true);
        this.index.update(
            (current) =>
                Array.from(this.visible.keys())
                    .filter((index) => this.visible.get(index))
                    .sort((a, b) => a - b)[0] ?? current,
        );
    }
}
