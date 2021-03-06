const { extname } = require('path');
const createGraph = require('ngraph.graph');

/*
From:
---
type: definition|theorem
id: <ID>
created: 2016-10-30T19:25:57Z
creator: <USER>
---
<CONTENT>

To:
---
title: Definition D1
type: definition|theorem
id: <ID>
created: 2016-10-30T19:25:57Z
creator: <USER>
layout: mathitem.njk
permalink: /D1/
---
<CONTENT>
*/

function capitalizeFirst(st) {
    return st[0].toUpperCase() + st.substring(1);
}

module.exports = () => function(files, metalsmith, done) {
    setImmediate(done);
    const graph = createGraph();
    for (const [file, data] of Object.entries(files)) {
        const { type, id } = data;
        if (['definition', 'theorem'].includes(type) && id) {
            data.title = capitalizeFirst(type) + ' ' + id;
            data.layout = 'mathitem.njk';
            data.permalink = `/${id}/`;
            graph.addNode('item:' + id, data);
            delete files[file];
            files[id + '/index' + extname(file)] = data;
            console.log(data.title);
        }
    }
    metalsmith.metadata().graph = graph;
};
