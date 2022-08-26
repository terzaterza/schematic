namespace dg {

export class Tool {
    constructor(
        public mouse_down: (ev: MouseEvent) => any,
        public mouse_move: (ev: MouseEvent) => any,
        public mouse_up: (ev: MouseEvent) => any,
        protected _diagram: Diagram
    ) {}

    protected mp(e: MouseEvent) {
        let c = this._diagram.svg.getScreenCTM();
        return new vec((e.clientX - c.e) / c.a, (e.clientY - c.f) / c.d);
    };

    protected target(e: Node) {
        if (e == null) return null;
        if ("attelem" in e) return e["attelem"];
        return this.target(e.parentNode);
    }
}

export class Select_Tool extends Tool {
    private p0: vec;

    constructor(_diagram: Diagram) {
        super(
            (ev: MouseEvent) => { this.p0 = this.mp(ev) },
            (ev: MouseEvent) => { /* DRAW BOUNDING RECT */},
            (ev: MouseEvent) => {
                if (this.p0.sub(this.mp(ev)).zero()) { // if only a click
                    let t = this.target(ev.target as Node) as Elem;
                    if (t == null) { _diagram.selected = []; return; }
                    _diagram.selected = [t];
                    if (t.on_click != null) t.on_click(t);
                    return;
                }
                let sel: Elem[] = [];
                let p1 = this.mp(ev);
                let ul = new vec(Math.min(this.p0.x, p1.x), Math.min(this.p0.y, p1.y));
                let br = new vec(Math.max(this.p0.x, p1.x), Math.max(this.p0.y, p1.y));
                for (let e of _diagram.elems) {
                    let in1 = e.p.x * _diagram.GS > ul.x && e.p.y * _diagram.GS > ul.y;
                    let in2 = e.br.x * _diagram.GS < br.x && e.br.y * _diagram.GS < br.y;
                    if (in1 && in2) sel.push(e);
                }
                _diagram.selected = sel;
            },
            _diagram
        );
    }
}

export class Move_Tool extends Tool {
    private p0: vec;
    constructor(_diagram: Diagram) {
        super(
            (ev: MouseEvent) => {
                if (_diagram.selected.length == 0) {
                    let t = this.target(ev.target as Node);
                    if (t == null) return;
                    _diagram.selected = [t];
                }
                this.p0 = this.mp(ev);
            },
            (ev: MouseEvent) => {
                if (this.p0 == null) return;
                if (_diagram.selected.length == 0) return;
                let p1 = this.mp(ev);
                let dp = p1.sub(this.p0).mult(1/_diagram.GS).round();
                if (dp.zero()) return;
                for (let e of _diagram.selected)
                    e.p = e.p.add(dp);
                this.p0 = this.p0.add(dp.mult(_diagram.GS));
            },
            () => {
                this.p0 = null;
                if (_diagram.selected.length == 1)
                    _diagram.selected = [];
            },
            _diagram
        );
    }
}

export class Line_Tool extends Tool {
    private p0: vec;

    constructor(diagram: Diagram) {
        super(
            (ev: MouseEvent) => { this.p0 = this.mp(ev).mult(1/diagram.GS).round(); },
            (ev: MouseEvent) => { /* DRAW CURRENT LINE */ },
            (ev: MouseEvent) => {
                let p1 = this.mp(ev).mult(1/diagram.GS).round();
                let dp = p1.sub(this.p0);
                if (dp.zero()) { this.p0 = null; return; }
                new Line(this.p0, p1, diagram);
                this.p0 = null;
            },
            diagram);
    }
}

}