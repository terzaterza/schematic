const svgns = "http://www.w3.org/2000/svg";

namespace dg {

export function arr_rm<T>(arr: T[], e: T): boolean {
    let i = arr.indexOf(e);
    if (i == -1) return false;
    arr.splice(i, 1);
    return true;
}

export class vec {
    constructor(private _x: number = 0, private _y: number = 0) {
    }
    
    public get x(): number {
        return this._x;
    }
    public set x(value: number) {
        this._x = value;
    }

    public get y(): number {
        return this._y;
    }
    public set y(value: number) {
        this._y = value;
    }

    public add(other: vec): vec {
        return new vec(this._x + other._x, this._y + other._y);
    }

    public sub(other: vec): vec {
        return new vec(this._x - other._x, this._y - other._y);
    }

    public mult(other: number): vec {
        return new vec(this._x * other, this._y * other);
    }

    public magm(): number {
        return Math.abs(this._x) + Math.abs(this._y);
    }

    public mag2(): number {
        return this._x ** 2 + this._y ** 2;
    }

    public mag(): number {
        return Math.sqrt(this.mag2());
    }

    public distm(other: vec): number {
        return Math.abs(this._x - other._x) + Math.abs(this._y - other._y);
    }

    public dist2(other: vec): number {
        return (this._x - other._x) ** 2 + (this._y - other._y) ** 2;
    }

    public dist(other: vec): number {
        return Math.sqrt(this.dist2(other));
    }

    public round(): vec {
        return new vec(Math.round(this._x), Math.round(this._y));
    }

    public zero(): boolean {
        return this._x == 0 && this._y == 0;
    }
}

export class Diagram {
    readonly GS = 20;

    private _elements: Elem[] = [];
    private _selected: Elem[] = [];

    protected _tool: Tool = new Move_Tool(this);

    constructor(private _svg: SVGSVGElement) {
        // this.init_drag();
        this._svg.addEventListener("mousedown", (ev: MouseEvent) => {this._tool.mouse_down(ev)});
        this._svg.addEventListener("mousemove", (ev: MouseEvent) => {this._tool.mouse_move(ev)});
        this._svg.addEventListener("mouseup", (ev: MouseEvent) => {this._tool.mouse_up(ev)});
        // this._svg.addEventListener("mouseleave", (ev: MouseEvent) => {this._tool.mouse_up(ev)});
    }

    public add(e: Elem) {
        this._elements.push(e);
        this._svg.appendChild(e.svg);
    }

    public remove(e: Elem) {
        arr_rm(this._elements, e);
        e.svg.remove();
    }

    public get elems(): Elem[] {
        return this._elements;
    }

    public get svg(): SVGSVGElement {
        return this._svg;
    }

    public get selected(): Elem[] {
        return this._selected;
    }

    public set selected(sel: Elem[]) {
        // for all selected remove border
        this._selected = sel;
        console.log("Selected", sel);
        // Here set selected border
    }

    public select() { this._tool = new Select_Tool(this); }
    public move() { this._tool = new Move_Tool(this); }
    public line() { this._tool = new Line_Tool(this); }
}

export class Elem {
    protected _p: vec = new vec(0, 0);
    // protected _svg: SVGGElement; // maybe change to private and use getter to access from inherited

    public on_click: (e: Elem) => void;
    public on_move: (e: Elem) => void;

    constructor(
        p: vec,
        protected _size: vec,
        protected _diagram: Diagram,
        protected _svg: SVGGElement
        ) {
            // this._svg = svg.cloneNode(true) as SVGGElement;
            this._svg["attelem"] = this;
            this.init_transforms();
            this.p = p;
            _diagram.add(this);
    }
    
    public get svg(): SVGGElement {
        return this._svg;
    }

    public get p(): vec {
        return this._p;
    }

    public set p(value: vec) {
        if (this._p.sub(value).zero()) return;
        this._p = new vec(value.x << 0, value.y << 0);
        let translate = this._svg.transform.baseVal.getItem(1);
        translate.setTranslate(this._p.x * this._diagram.GS, this._p.y * this._diagram.GS);
        if (this.on_move != null) this.on_move(this);
    }

    public get br(): vec {
        return this._p.add(this._size); // returns bottom left point
        // this is not true when block is rotated
        // fix this and also add ul (upper left)
    }

    private init_transforms() {
        let rotate = this._diagram.svg.createSVGTransform();
        let translate = this._diagram.svg.createSVGTransform();
        this._svg.transform.baseVal.appendItem(rotate);
        this._svg.transform.baseVal.appendItem(translate);
    }

    public remove() {
        this._diagram.remove(this);
    }
}

export class Block extends Elem {
    
    constructor(
        p: vec,
        size: vec,
        svg: SVGGElement,
        diagram: Diagram,
        ) {
            super(p, size, diagram, svg.cloneNode(true) as SVGGElement);
    }


}

export class Line extends Elem {
    constructor(p1: vec, p2: vec, diagram: Diagram) {
        let ul = new vec(Math.min(p1.x, p2.x), Math.min(p1.y, p2.y));
        let br = new vec(Math.max(p1.x, p2.x), Math.max(p1.y, p2.y));
        let size = br.sub(ul);
        if (size.x > size.y) size.y = 0;
        else size.x = 0;
        super(ul, size, diagram, Line.gen_svg(size, diagram));
    }

    public get pp(): vec {
        return this._p.add(this._size);
    }

    static gen_svg(size: vec, diagram: Diagram): SVGGElement {
        let g = document.createElementNS(svgns, "g");
        let l = document.createElementNS(svgns, "line");
        l.setAttribute("x1", "" + 0);
        l.setAttribute("y1", "" + 0);
        l.setAttribute("x2", "" + size.x * diagram.GS);
        l.setAttribute("y2", "" + size.y * diagram.GS);
        l.setAttribute("stroke", "#000000");
        l.setAttribute("shape-rendering", "crispEdges");
        g.appendChild(l);
        return g;
    }
}

}