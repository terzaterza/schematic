namespace test {

    export var test: sch.Circuit;
    var vec = dg.vec;

    export function on_load(svg) {
        test = new sch.Circuit(svg);
        
        let rg = document.createElementNS(svgns, "g");
        rg.appendChild(svg_rect(0, 0, 80, 40));

        let m1 = new sch.Model(
            "Resistor",
            "R",
            ["R"],
            ["v1", "v2"],
            [new vec(0, 1), new vec(4, 1)],
            new vec(4, 2),
            rg
        );

        test.inst(m1, new vec(20, 20));
        test.inst(m1, new vec(5, 5));
        test.inst(m1, new vec(20, 5));

        // let rect = new dg.Block(new vec(4, 6), new vec(1, 1), rg, test);
        // console.log(rect);
        // new dg.Block(new vec(4, 9), new vec(1, 1), rg, test);
    }

    function svg_rect(x, y, w, h) {
        let r = document.createElementNS(svgns, "rect");
        r.setAttribute("x", x);
        r.setAttribute("y", y);
        r.setAttribute("width", w);
        r.setAttribute("height", h);
        return r;
    }
}
var on_load = test.on_load;