namespace dig {
    type vec = dg.vec;

    class Module extends sch.Circuit {
        private _queue: pq.PriorityQueue = new pq.PriorityQueue((a, b) => a[0] < b[0]);
        private _working = false;

        // private _input_pins: Input_Pin[];
        // private _output_pins: Output_Pin[];

        public add_action(time: number, net: sch.Net, value: any): void {
            this._queue.push([time, net, value]);
            if (!this._working) this.work();
        }

        public work(): void {
            this._working = true;
            while (!this._queue.isEmpty()) {
                let x: [number, Net, any] = this._queue.pop();
                x[1].change_val(x[2], x[0]);
            }
            this._working = false;
        }

        protected reset_nets(): void {
            super.reset_nets(Net);
        }

        protected short_wires(net_class?: typeof sch.Net): void {
            super.short_wires(Net);
        }

        protected connect_pins(): void {
            super.connect_pins();
            for (let p of this.pins) {
                let sm = p.block as Submodule;
                if (sm.in_pins.includes(p))
                    (p.net as Net).connected_inputs.push(p);
            }
        }
    }

    class Submodule extends sch.Block {

        constructor(
            p: vec,
            model: sch.Model,
            circuit: Module,
            protected _in_pins: sch.Pin[],
            protected _out_pins: sch.Pin[]
        ) {
            super(p, model, circuit);
        }

        public get in_pins(): sch.Pin[] {
            return this._in_pins;
        }

        protected in_values(): any[] {
            let r = [];
            for (let p of this._in_pins)
                r.push(p.net.value);
            return r;
        }

        public on_change_input(pin: sch.Pin, t: number) {
            throw "Not Implemented";
        }
    }

    class Gate extends Submodule {
        constructor(
            p: vec,
            model: sch.Model,
            circuit: Module,
            input_count: number,
            private _t_prop: number[], // this assumes all outputs change with same t_prop, for diff t_prop per output use matrix for t_prop
            private _f: ((in_val: any[]) => any)[] // logical functions - should be part of the model
        ) {
            super(p, model, circuit, null, null);
            console.assert(_t_prop.length == input_count);
            console.assert(_f.length == model.pins.length - input_count);
            this._in_pins = this.pins.slice(0, input_count);
            this._out_pins = this.pins.slice(input_count);
        }

        public on_change_input(pin: sch.Pin, t: number): void {
            let i = this._in_pins.indexOf(pin);
            let t1 = t + this._t_prop[i];
            let m = this._diagram as Module;
            for (let o of this._out_pins)
                m.add_action(t1, o.net, this._f[i]);
        }
    }

    class Net extends sch.Net {
        private _connected_inputs: sch.Pin[] = [];

        public get connected_inputs(): sch.Pin[] {
            return this._connected_inputs;
        }

        public change_val(v: any, t: number): void {
            if (v == this.value) return;
            console.log("Node", this.id, this.value, "->", v, "@", t);
            super.value = v;
            for (let p of this._connected_inputs)
                (p.block as Submodule).on_change_input(p, t);
        }
    }

    // USE THIS BELOW FOR DIGITAL SIMULATOR
    // class In_Pin extends sch.Pin {
    //     constructor(p: vec, block: Block) {
    //         super(p, block);
    //     }
    
    // public on_net_value_change() {...}
    
    // }

    // class Out_Pin extends Pin {
    //     ...
    // }
}

namespace pq {

    const top = 0;
    const parent = i => ((i + 1) >>> 1) - 1;
    const left = i => (i << 1) + 1;
    const right = i => (i + 1) << 1;
    
    export class PriorityQueue {
        private _heap;
        private _comparator;
    
        constructor(comparator = (a, b) => a > b) {
            this._heap = [];
            this._comparator = comparator;
        }
        size() {
            return this._heap.length;
        }
        isEmpty() {
            return this.size() == 0;
        }
        peek() {
            return this._heap[top];
        }
        push(...values) {
            values.forEach(value => {
                this._heap.push(value);
                this._siftUp();
            });
            return this.size();
        }
        pop() {
            const poppedValue = this.peek();
            const bottom = this.size() - 1;
            if (bottom > top) {
                this._swap(top, bottom);
            }
            this._heap.pop();
            this._siftDown();
            return poppedValue;
        }
        replace(value) {
            const replacedValue = this.peek();
            this._heap[top] = value;
            this._siftDown();
            return replacedValue;
        }
        _greater(i, j) {
            return this._comparator(this._heap[i], this._heap[j]);
        }
        _swap(i, j) {
            [this._heap[i], this._heap[j]] = [this._heap[j], this._heap[i]];
        }
        _siftUp() {
            let node = this.size() - 1;
            while (node > top && this._greater(node, parent(node))) {
                this._swap(node, parent(node));
                node = parent(node);
            }
        }
        _siftDown() {
            let node = top;
            while (
                (left(node) < this.size() && this._greater(left(node), node)) ||
                (right(node) < this.size() && this._greater(right(node), node))
            ) {
                let maxChild = (right(node) < this.size() && this._greater(right(node), left(node))) ? right(node) : left(node);
                this._swap(node, maxChild);
                node = maxChild;
            }
        }
    }
    }