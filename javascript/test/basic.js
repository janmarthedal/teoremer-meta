import {assert} from 'chai';
import {normalizeTeX} from '../pure-fun';
import markdown_to_item_dom from '../markdown-to-item-dom';
import eqn_typeset from '../eqn-typeset';
import item_dom_to_html from '../item-dom-to-html';

describe('Pure functions', function() {
    it('normalizeTeX', function() {
        assert.equal('\\sin(x)+b', normalizeTeX(' \\sin ( x) +  b'));
        assert.equal('\\sum_{k=1}^nk', normalizeTeX('\\sum_{k = 1}^n k'));
    });
});

describe('Prepare item', function() {
    describe('markdown-to-item-dom', function() {
        it('1', function(done) {
            markdown_to_item_dom(
`Inline math $x$ and

$$
\\sum_{k=1}^n k
$$

More $x$ inline $a+b$ math.`
            ).then(item_dom => {
                assert.deepEqual(
                    {"document":{"type":"body","children":[
                        {"type":"para","children":[
                            {"type":"text","value":"Inline math "},{"type":"eqn","eqn":1},{"type":"text","value":" and"}
                        ]},{"type":"text","value":"\n"},{"type":"para","children":[
                            {"type":"eqn","eqn":2}]},{"type":"text","value":"\n"},{"type":"para","children":[
                                {"type":"text","value":"More "},{"type":"eqn","eqn":1},{"type":"text","value":" inline "},
                                {"type":"eqn","eqn":3},{"type":"text","value":" math."}
                            ]},{"type":"text","value":"\n"}
                        ]},
                    "eqns":{
                        "1":{"format":"inline-TeX","math":"x"},
                        "2":{"format":"TeX","math":"\\sum_{k=1}^nk"},
                        "3":{"format":"inline-TeX","math":"a+b"}}}, item_dom);
                done();
            });
        });
        it('2', function(done) {
            markdown_to_item_dom(
`Concept definition 1: [](=some-concept-a)

Concept definition 2: [some-text-b](=some-concept-b)

Concept reference 1: [](#some-concept-c)

Concept reference 2: [some-text-d](#some-concept-d)

Item reference 1: [](D123)

Item reference 2: [some-text-f](T123)

Item+concept reference 1: [](D123#some-concept-g)

Item+concept reference 2: [some-text-g](D123#some-concept-g)
`
            ).then(item_dom => {
                assert.deepEqual({
                    "document":{
                        "type":"body",
                        "children":[
                            {
                                "type":"para",
                                "children":[
                                    {
                                        "type":"text",
                                        "value":"Concept definition 1: "
                                    },{
                                        "type":"concept-def",
                                        "concept":"some-concept-a"
                                    }
                                ]
                            },{
                                "type":"text","value":"\n"
                            },{
                                "type":"para","children":[
                                    {
                                        "type":"text",
                                        "value":"Concept definition 2: "
                                    },{
                                        "type":"concept-def",
                                        "concept":"some-concept-b",
                                        "children":[
                                            {
                                                "type":"text",
                                                "value":"some-text-b"
                                            }
                                        ]
                                    }
                                ]
                            },{
                                "type":"text",
                                "value":"\n"
                            },{
                                "type":"para",
                                "children":[
                                    {
                                        "type":"text",
                                        "value":"Concept reference 1: "
                                    },{
                                        "type":"concept-ref",
                                        "concept":"some-concept-c",
                                        "children":[
                                            {
                                                "type":"text",
                                                "value":"some-concept-c"
                                            }
                                        ]
                                    }
                                ]
                            },{
                                "type":"text",
                                "value":"\n"
                            },{
                                "type":"para",
                                "children":[
                                    {
                                        "type":"text",
                                        "value":"Concept reference 2: "
                                    },{
                                        "type":"concept-ref",
                                        "concept":"some-concept-d",
                                        "children":[
                                            {
                                                "type":"text",
                                                "value":"some-text-d"
                                            }
                                        ]
                                    }
                                ]
                            },{
                                "type":"text",
                                "value":"\n"
                            },{
                                "type":"para",
                                "children":[
                                    {
                                        "type":"text",
                                        "value":"Item reference 1: "
                                    },{
                                        "type":"item-ref",
                                        "item":"D123",
                                        "children":[
                                            {
                                                "type":"text",
                                                "value":"D123"
                                            }
                                        ]
                                    }
                                ]
                            },{
                                "type":"text",
                                "value":"\n"
                            },{
                                "type":"para",
                                "children":[
                                    {
                                        "type":"text",
                                        "value":"Item reference 2: "
                                    },{
                                        "type":"item-ref",
                                        "item":"T123",
                                        "children":[
                                            {
                                                "type":"text",
                                                "value":"some-text-f"
                                            }
                                        ]
                                    }
                                ]
                            },{
                                "type":"text",
                                "value":"\n"
                            },{
                                "type":"para",
                                "children":[
                                    {
                                        "type":"text",
                                        "value":"Item+concept reference 1: "
                                    },{
                                        "type":"item-ref",
                                        "item":"D123",
                                        "concept":"some-concept-g",
                                        "children":[
                                            {
                                                "type":"text",
                                                "value":"some-concept-g"
                                            }
                                        ]
                                    }
                                ]
                            },{
                                "type":"text",
                                "value":"\n"
                            },{
                                "type":"para",
                                "children":[
                                    {
                                        "type":"text",
                                        "value":"Item+concept reference 2: "
                                    },{
                                        "type":"item-ref",
                                        "item":"D123",
                                        "concept":"some-concept-g",
                                        "children":[
                                            {
                                                "type":"text",
                                                "value":"some-text-g"
                                            }
                                        ]
                                    }
                                ]
                            },{
                                "type":"text",
                                "value":"\n"
                            }
                        ]
                    },"eqns":{}
                }, item_dom);
                done();
            });
        });
    });

    describe('eqn-typeset', function() {
        function tester(key, format, math, html, done) {
            eqn_typeset(key, {format:format, math:math}).then(ret => {
                assert.equal(ret[0], key);
                assert.equal(ret[1].format, format);
                assert.equal(ret[1].math, math);
                assert.equal(ret[1].html, html);
                done();
            });
        }
        it('1', function(done) {
            tester('key-1', "TeX", "\\sum_{k=1}^n k", '<span class="mjx-chtml MJXc-display" style="text-align: center;"><span id="MathJax-Element-1-Frame" class="mjx-chtml"><span id="MJXc-Node-1" class="mjx-math" role="math"><span id="MJXc-Node-2" class="mjx-mrow"><span id="MJXc-Node-3" class="mjx-munderover"><span class="mjx-itable"><span class="mjx-row"><span class="mjx-cell"><span class="mjx-stack"><span class="mjx-over" style="font-size: 70.7%; padding-bottom: 0.247em; padding-top: 0.141em; padding-left: 0.721em;"><span id="MJXc-Node-10" class="mjx-mi" style=""><span class="mjx-char MJXc-TeX-math-I" style="padding-top: 0.225em; padding-bottom: 0.298em;">n</span></span></span><span class="mjx-op"><span id="MJXc-Node-4" class="mjx-mo"><span class="mjx-char MJXc-TeX-size2-R" style="padding-top: 0.74em; padding-bottom: 0.74em;">∑</span></span></span></span></span></span><span class="mjx-row"><span class="mjx-under" style="font-size: 70.7%; padding-top: 0.236em; padding-bottom: 0.141em; padding-left: 0.122em;"><span id="MJXc-Node-5" class="mjx-texatom" style=""><span id="MJXc-Node-6" class="mjx-mrow"><span id="MJXc-Node-7" class="mjx-mi"><span class="mjx-char MJXc-TeX-math-I" style="padding-top: 0.446em; padding-bottom: 0.298em;">k</span></span><span id="MJXc-Node-8" class="mjx-mo"><span class="mjx-char MJXc-TeX-main-R" style="padding-top: 0.077em; padding-bottom: 0.298em;">=</span></span><span id="MJXc-Node-9" class="mjx-mn"><span class="mjx-char MJXc-TeX-main-R" style="padding-top: 0.372em; padding-bottom: 0.372em;">1</span></span></span></span></span></span></span></span><span id="MJXc-Node-11" class="mjx-mi MJXc-space1"><span class="mjx-char MJXc-TeX-math-I" style="padding-top: 0.446em; padding-bottom: 0.298em;">k</span></span></span></span></span></span>', done);
        });
    });
});

describe('Render item', function() {
    it('item-dom-to-html', function(done) {
        item_dom_to_html('D', {"type":"body"}, {}, {}).then(ret => {
            assert.lengthOf(ret.defined, 0);
            assert.isNotOk(ret.has_text);
            assert.strictEqual(ret.html, '');
            assert.include(ret.errors, 'A Definition may not be empty');
            assert.include(ret.errors, 'A Definition must define at least one concept');
            assert.lengthOf(ret.errors, 2);
            done();
        });
    });
});