namespace sch {
    type vec = dg.vec;
    type BWElem = Block | Wire;

    export class Circuit extends dg.Diagram {
        private _blocks: Block[] = [];
        private _wires: Wire[] = [];
        private _pins: Pin[] = [];

        constructor(svg: SVGSVGElement) {
            super(svg);
        }

        public add(e: BWElem) {
            super.add(e);
            if (e instanceof Block) {
                this._blocks.push(e);
                // this._pins.push(...e.pins);
            }
            else {
                this._wires.push(e);
            }
        }

        public remove(e: BWElem) {
            super.remove(e);
            if (e instanceof Block) {
                dg.arr_rm(this._blocks, e);
                for (let p of e.pins)
                    dg.arr_rm(this._pins, p);
            }
            else dg.arr_rm(this._wires, e);
        }

        public inst(m: Model, p: vec): void {
            new Block(p, m, this);
        }

        public get pins() { // should only be accessed by new blocks trying to add their pins
            return this._pins;
        }

        public get wires() { // should only be accessed by wires when looking for shorts
            return this._wires;
        }

        public line() {
            class Wire_Tool extends dg.Tool {
                private p0: vec;
                constructor(diagram: Circuit) {
                    super(
                        (ev: MouseEvent) => { this.p0 = this.mp(ev).mult(1/diagram.GS).round(); },
                        (ev: MouseEvent) => { /* DRAW CURRENT LINE */ },
                        (ev: MouseEvent) => {
                            let p1 = this.mp(ev).mult(1/diagram.GS).round();
                            let dp = p1.sub(this.p0);
                            if (dp.zero()) { this.p0 = null; return; }
                            new Wire(this.p0, p1, diagram);
                            this.p0 = null;
                        },
                        diagram);
                }
            }
            this._tool = new Wire_Tool(this);
        }

        public netlist() {
            this.reset_nets();
            this.short_wires();
            this.connect_pins();
            this.num_nets();

            let r = [];
            for (let b of this._blocks)
                r.push(b.netstr());
            return r;
        }

        private reset_nets() {
            for (let w of this._wires) w.net = null;
            for (let p of this._pins) p.net = new Net();
        }

        private short_wires() {
            function dfs(w: Wire, n: Net, visited: Set<Wire>): void {
                console.assert(w.net == null);
                w.net = n;
                visited.add(w);
                for (let ws of w.shorts)
                    if (!visited.has(ws))
                        dfs(ws, n, visited);
            }
            for (let w of this._wires)
                if (w.net == null)
                    dfs(w, new Net(), new Set<Wire>());
        }

        private connect_pins() {
            for (let i = 0; i < this._pins.length-1; i++)
                for (let j = i + 1; j < this._pins.length; j++)
                    if (this._pins[i].p.sub(this._pins[j].p).zero())
                        this._pins[j].net = this._pins[i].net;
            for (let w of this._wires)
                for (let p of this._pins)
                    if (w.on_wire(p.p))
                        p.net = w.net;
        }

        private num_nets() {
            let netset = new Set<Net>();
            // handle ground or fixed net id nets
            for (let p of this._pins)
                if (p.net.id == "")
                    netset.add(p.net);
            let i = 0;
            for (let n of netset)
                n.id = "" + ++i;
        }
    }

    class Net {
        constructor(private _id: string = "") {

        }

        public get id(): string { return this._id; }
        public set id(s: string) { this._id = s; }
    }

    class Pin {
        private _net: Net;

        constructor(
            private _p: vec,
            private _block: Block
        ) {}

        public get p(): vec {
            return this._block.p.add(this._p);
        }

        public get net(): Net {
            return this._net;
        }

        public set net(n: Net) {
            this._net = n;
        }
    }

    // USE THIS BELOW FOR DIGITAL SIMULATOR
    // class In_Pin extends Pin {
    //     constructor(p: vec, block: Block) {
    //         super(p, block);
    //     }
    //
    // public on_net_value_change() {...}
    //
    // }

    // class Out_Pin extends Pin {
    //     ...
    // }

    export class Model {
        constructor(
            public readonly name: string,
            public readonly label: string,
            public readonly params: string[],
//            public readonly param_val: number[], // this can be a number, or maybe letter (symbolic)
            public readonly pins: string[],
            public readonly pinp: vec[],
            public readonly size: vec,
            public readonly svg: SVGGElement
        ) {

        }
    }

    class Block extends dg.Block {
        // private _in_pins: In_Pin[];
        // private _out_pins: Out_Pin[];
        private _pins: Pin[] = [];
        // private _params: string[];
        
        constructor(p: vec, private _model: Model, circuit: Circuit) {
            super(p, _model.size, _model.svg, circuit);
            for (let pp of _model.pinp)
                this._pins.push(new Pin(pp, this));
            circuit.pins.push(...this._pins);
        }

        public get pins(): Pin[] {
            return this._pins;
        }

        public netstr(): string {
            let r = [this._model.label];
            for (let i = 0; i < this._model.pins.length; i++)
                r.push(this._model.pins[i], this._pins[i].net.id);
            // for p of params
            return r.join(" ");
        }
    }

    class Wire extends dg.Line {
        private _net: Net;
        private _shorts: Wire[];

        public on_wire(p: vec): boolean {
            return p.distm(this._p) + p.distm(this.pp) == this._size.magm();
        }

        public short(w: Wire): boolean {
            let s1 = this.on_wire(w.p) || this.on_wire(w.pp);
            let s2 = w.on_wire(this.p) || w.on_wire(this.pp);
            return s1 || s2;
        }

        public get net(): Net {
            return this._net;
        }

        public set net(n: Net) {
            this._net = n;
        }

        public get shorts(): Wire[] {
            return this._shorts;
        }

        public set p(val: vec) {
            super.p = val; // hope this works
            if (this._shorts != null) // when created it first calls this function before creating the array
                for (let w of this._shorts)
                    dg.arr_rm(w._shorts, this);
            this._shorts = [];
            for (let w of (this._diagram as Circuit).wires)
                if (w.short(this)) {
                    w._shorts.push(this);
                    this._shorts.push(w);
                }
            // can short wires here not in circuit, since shorts list changes only when moved or created
        }

        public get p(): vec { // for some reason this is not inherited from element and must be explicitly typed
            return this._p;
        }

    }
}