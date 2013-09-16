(function(window) {

    var $ = window.jQuery;

    var api_prefix = '/api/';

    var teoremer = {};

    teoremer.setupCsrf = function() {
        var csrftoken = $.cookie('csrftoken');

        function csrfSafeMethod(method) {
            // these HTTP methods do not require CSRF protection
            return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
        }

        $.ajaxSetup({
            crossDomain: false, // obviates need for sameOrigin test
            beforeSend: function(xhr, settings) {
                if (!csrfSafeMethod(settings.type)) {
                    xhr.setRequestHeader("X-CSRFToken", csrftoken);
                }
            }
        });
    };

    function typeset_tag(st) {
        var elems = st.split('$');
        for (var n = 0; n < elems.length; n++) {
            if (n % 2 != 0) {
                elems[n] = '\\(' + elems[n] + '\\)';
            }
        }
        return elems.join('');
    }

    function typeset_tag_list(tag_list) {
        return _.map(tag_list, typeset_tag);
    }

    function type_short_to_long(st) {
        switch (st.toUpperCase()) {
            case 'D':
                return 'definition';
            case 'T':
                return 'theorem';
            case 'P':
                return 'proof';
        }
    }

    function capitalize(st) {
        return st.charAt(0).toUpperCase() + st.slice(1);
    }

    function reverse_view(view, arg1, arg2) {
        var url = '/';
        if (view == 'drafts.views.show') {
            url = '/draft/' + arg1;
        } else if (view == 'items.views.show_final') {
            url = '/item/' + arg1;
        } else if (view == 'sources.views.index') {
            url = '/sources/';
        } else if (view == 'sources.views.add_location_for_item') {
            url = '/item/' + arg1 + '/add-validation/' + arg2;
        } else if (view == 'sources.views.add_location_for_draft') {
            url = '/draft/' + arg1 + '/add-validation/' + arg2;
        } else {
            console.log('Cannot do reverse lookup for view ' + view);
        }
        return url;
    }

    function reverse_view_redirect(view, arg1, arg2) {
        window.location.href = reverse_view(view, arg1, arg2);
    }

    function cleanValues(attrs, escape) {
        var data = {};
        _.each(attrs, function(value, key) {
            if (_.isArray(value)) {
                var v = _.compact(_.map(value, $.trim));
                if (v.length) data[key] = escape ? _.map(v, _.escape) : v;
            } else if (_.isString(value)) {
                var v = $.trim(value);
                if (v) data[key] = escape ? _.escape(v) : v;
            }
        });
        return data;
    }

    function typeset_source(attrs) {
        var data = cleanValues(attrs, true), ret = '', type = data.type, items;
        // author
        if (data.author) {
            if (data.author.length === 1) {
                ret += _.first(data.author);
            } else if (data.author.length === 2) {
                ret += _.first(data.author) + ' and ' + _.last(data.author);
            } else {
                ret += _.initial(data.author).join(', ') + ', and ' + _.last(data.author);
            }
            ret += '. ';
        }
        // title
        if (data.title) {
            ret += '<i>' + data.title + '</i>. ';
        }
        if (type == 'book') {
            // edition
            if (data.edition) {
                ret += data.edition + ' edition. ';
            }
            // series, volume, number
            items = [];
            if (data.series) items.push(data.series);
            if (data.volume) items.push('Volume ' + data.volume);
            if (data.number) items.push('Number ' + data.number);
            if (items.length) {
                ret += items.join(', ') + '. ';
            }
            // publisher, address, month, year
            items = _.compact([data.publisher, data.address, data.month, data.year]);
            if (items.length) {
                ret += items.join(', ') + '. ';
            }
        }
        // note
        if (data.note) {
            ret += data.note + '.';
        }
        return ret;
    }

    /***************************
     * Models and collections
     ***************************/

    // private

    var TagItem = Backbone.Model.extend({
        // name
        typeset: function() {
            return typeset_tag(this.get('name'));
        },
        toJSON: function() {
            return this.get('name');
        },
        parse: function(resp) {
            return { name: resp };
        }
    });

    var TagList = Backbone.Collection.extend({
        model: TagItem,
        parse: function(resp) {
            return _.map(resp, function(item) {
                return new TagItem(item, { parse: true });
            });
        }
    });

    var Category = Backbone.Model.extend({
        // tag_list
        typeset: function() {
            return Handlebars.templates.tag_list({
                tags: this.get('tag_list').map(function(tag_item) {
                    return tag_item.typeset();
                })
            });
        },
        toJSON: function() {
            return this.get('tag_list').map(function(tag_item) {
                return tag_item.toJSON();
            });
        },
        parse: function(resp) {
            return {
                tag_list: new TagList(resp, { parse: true })
            };
        }
    });

    var CategoryList = Backbone.Collection.extend({
        model: Category,
        parse: function(resp) {
            return _.map(resp, function(item) {
                return new Category(item, { parse: true });
            });
        }
    });

    var TagAssociation = Backbone.Model.extend({
        toJSON: function() {
            return {
                tag: this.get('tag').toJSON(),
                category: this.get('category').toJSON()
            };
        },
        parse: function(resp) {
            return {
                tag: new TagItem(resp.tag, { parse: true }),
                category: new Category(resp.category, { parse: true })
            };
        }
    });

    var TagAssociationList = Backbone.Collection.extend({
       model: TagAssociation,
       parse: function(resp) {
            return _.map(resp, function(item) {
                return new TagAssociation(item, { parse: true });
            });
       }
    });

    var MathItem = Backbone.Model;

    var TopList = Backbone.Collection.extend({
        model: MathItem,
        parse: function(response) {
            return response.items;
        }
    });

    var SearchList = Backbone.Collection.extend({
        has_more: false,
        initialize: function() {
            _.bindAll(this, 'parse');
        },
        model: MathItem,
        url: api_prefix + 'item/search',
        parse: function(response) {
            this.has_more = response.meta.has_more;
            return response.items;
        }
    });

    // public

    teoremer.DraftItem = Backbone.Model.extend({
        urlRoot: api_prefix + 'draft/',
        parse: function(resp) {
            var parsed = {
                body:    resp.body,
                pricats: new CategoryList(resp.pricats, { parse: true }),
                seccats: new CategoryList(resp.seccats, { parse: true })
            };
            if ('id' in resp) {                // updating
                parsed.id = resp.id;
            } else {                           // new
                parsed.type = resp.type;
                if ('parent' in resp) {
                    parsed.parent = resp.parent;
                }
            }
            return parsed;
        }
    });

    teoremer.FinalItem = Backbone.Model.extend({
        urlRoot: api_prefix + 'item/',
        parse: function(resp) {
            return {
                id:        resp.id,
                pricats:   new CategoryList(resp.pricats, { parse: true }),
                seccats:   new CategoryList(resp.seccats, { parse: true }),
                tagcatmap: new TagAssociationList(resp.tagcatmap, { parse: true })
            };
        }
    });

    teoremer.SearchTerms = Backbone.Model.extend({
        defaults: {
            status: 'F',
            includeTags: [],
            excludeTags: []
        },
        toJSON: function() {
            var data = _.clone(this.attributes);
            data.intags = JSON.stringify(data.includeTags);
            data.extags = JSON.stringify(data.excludeTags);
            delete data.includeTags;
            delete data.excludeTags;
            return data;
        }
    });

    teoremer.SourceItem = Backbone.Model.extend({
        urlRoot: api_prefix + 'source/',
        defaults: {
            type: 'book'
        }
    });

    var ValidationItem = Backbone.Model;

    teoremer.ValidationList = Backbone.Collection.extend({
        model: ValidationItem
    });

    /***************************
     * Views
     ***************************/

    var RemovableTagView = Backbone.View.extend({
        tagName: 'span',
        className: 'tag',
        events: {
            'click .delete-tag': 'remove'
        },
        initialize: function() {
            _.bindAll(this, 'render', 'unrender', 'remove');
            this.model.on('change', this.render);
            this.model.on('remove', this.unrender);
        },
        render: function() {
            var tag_html = this.model.typeset();
            this.$el.html(tag_html + ' <i class="icon-remove delete-tag"></i>');
            return this;
        },
        unrender: function() {
            this.$el.remove();
        },
        remove: function() {
            this.model.destroy();
        }
    });

    teoremer.TagListView = Backbone.View.extend({
        // standard
        events: function() {
            var e = {};
            e['click #tag-add-' + this.uid] = 'addItem';
            e['keypress #tag-name-' + this.uid] = 'keyPress';
            return e;
        },
        initialize: function() {
            _.bindAll(this, 'render', 'addItem', 'addOne', 'keyPress', 'getTagList', 'events');
            this.uid = _.uniqueId();
            this.collection = new TagList();
            this.collection.bind('add', this.addOne);
            this.render();
            this.input_field = this.$('#tag-name-' + this.uid);
            /*this.input_field.typeahead({
                source: function(query, process) {
                    $.get(api_prefix + 'tags/prefixed/' + query, function(data) {
                        process(data);
                    }, 'json');
                }
            });*/
        },
        render: function() {
            var html = Handlebars.templates.tag_list_input({
                uid: this.uid
            });
            this.$el.html(html);
            this.collection.each(this.addOne);
        },
        // helpers
        keyPress: function(e) {
            if (e.keyCode == 13) {
                this.addItem();
            }
        },
        addItem: function() {
            var value = this.input_field.val();
            if (value) {
                this.input_field.val('');
                var item = new TagItem({
                    name: value
                });
                this.collection.add(item);
            }
        },
        addOne: function(item) {
            var removableTagView = new RemovableTagView({
                model: item
            });
            this.$('#tag-list-' + this.uid).append(removableTagView.render().el);
            MathJax.Hub.Queue(["Typeset", MathJax.Hub, removableTagView.$el.get()]);
        },
        // public methods
        getTagList: function() {
            return this.collection.map(function(item) {
                return item.get('name');
            });
        }
    });

    teoremer.MathItemView = Backbone.View.extend({
        tagName: 'li',
        className: 'list-group-item clearfix',
        initialize: function() {
            _.bindAll(this, 'render');
            this.model.bind('change', this.render);
        },
        render: function() {
            var categories = this.model.get('categories');
            var name = capitalize(type_short_to_long(this.model.get('type'))) + ' ' + this.model.get('id');
            if (this.model.has('parent')) {
                var parent = this.model.get('parent');
                name += ' of ' + capitalize(type_short_to_long(parent.type)) + ' ' + parent.id;
            }
            var html = Handlebars.templates.search_list_item({
                id:          this.model.get('id'),
                item_name:   name,
                item_link:   this.model.get('item_link'),
                pritags:     _.map(_.map(categories.primary, _.last), typeset_tag).join(', '),
                sectags:     _.map(categories.secondary, typeset_tag_list),
                author_name: this.model.get('author'),
                author_link: this.model.get('author_link'),
                timestamp:   this.model.get('timestamp')
            });
            this.$el.html(html);
            return this;
        }
    });

    teoremer.SearchListView = Backbone.View.extend({
        events: {
            'click .search-list-more':   function() { this.doFetch(true); },
            'click .select-final':       function() { this.options.parameters.set('status', 'F'); },
            'click .select-review':      function() { this.options.parameters.set('status', 'R'); },
            'click .select-draft':       function() { this.options.parameters.set('status', 'D'); },
            'click .select-definitions': function() { this.options.parameters.set('type', 'D'); },
            'click .select-theorems':    function() { this.options.parameters.set('type', 'T'); },
            'click .select-proofs':      function() { this.options.parameters.set('type', 'P'); }
        },
        initialize: function() {
            _.bindAll(this, 'render', 'addOne', 'doFetch', 'fetchReset');
            this.collection = new SearchList();
            this.collection.on('reset', this.render);
            this.collection.on('add', this.addOne);
            this.options.parameters.set('type', this.options.itemtypes.charAt(0));
            this.options.parameters.on('change', this.fetchReset, this);
            this.render();
        },
        postAppend: function() {
            if (this.collection.has_more) {
                this.$('.search-list-more').show();
            } else {
                this.$('.search-list-more').hide();
            }
        },
        render: function() {
            var status = this.options.parameters.get('status');
            var type = this.options.parameters.get('type');
            var html = Handlebars.templates.search_list_container({
                enable_drafts:      !!this.options.enable_drafts,
                status_final:       status == 'F',
                status_review:      status == 'R',
                status_draft:       status == 'D',
                enable_definitions: this.options.itemtypes.indexOf('D') != -1,
                enable_theorems:    this.options.itemtypes.indexOf('T') != -1,
                enable_proofs:      this.options.itemtypes.indexOf('P') != -1,
                type_definition:    type == 'D',
                type_theorem:       type == 'T',
                type_proof:         type == 'P'
            });
            this.$el.html(html);
            this.collection.each(this.addOne);
            this.postAppend();
        },
        addOne: function(item) {
            var mathItemView = new teoremer.MathItemView({
                model: item
            });
            this.$('ul').append(mathItemView.render().el);
            MathJax.Hub.Queue(["Typeset", MathJax.Hub, mathItemView.$el.get()]);
        },
        doFetch: function(append) {
            var options = {};
            options.data = this.options.parameters.toJSON();
            if (append) {
                var self = this;
                options.remove = false;
                options.data.offset = this.collection.length;
                options.success = function() {
                    self.postAppend();
                };
            } else {
                options.reset = true;
                options.data.offset = 0;
            }
            this.collection.fetch(options);
        },
        fetchReset: function() {
            this.doFetch(false);
        }
    });

    teoremer.TopListView = Backbone.View.extend({
        initialize: function() {
            _.bindAll(this, 'render', 'addOne');
            this.collection = new TopList();
            this.collection.on('reset', this.render);
            this.collection.on('add', this.addOne);
            this.render();
        },
        render: function() {
            var html = Handlebars.templates.top_list_container();
            this.$el.html(html);
            this.collection.each(this.addOne);
        },
        addOne: function(item) {
            var mathItemView = new teoremer.MathItemView({
                model: item
            });
            this.$('tbody').append(mathItemView.render().el);
            MathJax.Hub.Queue(["Typeset", MathJax.Hub, mathItemView.$el.get()]);
        }
    });

    teoremer.BodyEditView = Backbone.View.extend({
        initialize: function() {
            _.bindAll(this, 'render');
            var self = this;
            this.$el.on('input propertychange', function() {
                self.model.set('body', this.value);
            });
            this.render();
        },
        render: function() {
            this.$el.val(this.model.get('body'));
            return this;
        }
    });

    teoremer.BodyPreviewView = Backbone.View.extend({
        initialize: function() {
            this.converter = new Showdown.converter();
            this.model.on('change:body', this.render, this);
            this.render.call(this);
        },
        render: function() {
            var source = this.model.get('body');
            var insertsCounter = 0, mathInserts = {}, inserts = {}, key;
            var pars = source.split('$$');
            for (var i = 0; i < pars.length; i++) {
                if (i % 2) {
                    key = 'zZ' + (++insertsCounter) + 'Zz';
                    mathInserts[key] = '\\[' + pars[i] + '\\]';
                    pars[i] = key;
                } else {
                    pars2 = pars[i].split('$');
                    for (var j = 0; j < pars2.length; j++) {
                        if (j % 2) {
                            key = 'zZ' + (++insertsCounter) + 'Zz';
                            mathInserts[key] = '\\(' + pars2[j] + '\\)';
                            pars2[j] = key;
                        }
                    }
                    pars[i] = pars2.join('');
                }
            }
            source = pars.join('');
            // [text#tag] or [#tag]
            source = source.replace(/\[([^#\]]*)#([\w -]+)\]/g, function(full_match, text, tag) {
                text = text || tag;
                key = 'zZ' + (++insertsCounter) + 'Zz';
                inserts[key] = '<a href="#" rel="tooltip" data-original-title="tag: ' + tag + '"><i>' + text + '</i></a>';
                return key;
            });
            // [@q25tY]
            source = source.replace(/\[([^@\]]*)@(\w+)\]/g, function(full_match, text, item_id) {
                text = text || item_id;
                key = 'zZ' + (++insertsCounter) + 'Zz';
                inserts[key] = '<a href="#" rel="tooltip" data-original-title="item: ' + item_id + '"><b>' + text + '</b></a>';
                return key;
            });
            // disable markdown links and images
            source = source.replace("[", "&#91;").replace("]", "&#93;").replace("<", "&lt;").replace(">", "&gt;");
            var html = this.converter.makeHtml(source);
            for (key in inserts) {
                html = html.replace(key, inserts[key]);
            }
            for (key in mathInserts) {
                html = html.replace(key, mathInserts[key]);
            }
            this.$el.html(html);
            this.$el.tooltip({
                selector: "a[rel=tooltip]"
            });
            MathJax.Hub.Queue(["Typeset", MathJax.Hub, this.$el.get()]);
        }
    });

    teoremer.SaveDraftView = Backbone.View.extend({
        events: {
            'click': 'save'
        },
        initialize: function() {
            _.bindAll(this, 'save');
        },
        save: function() {
            this.model.save(null, {
                wait: true,
                success: function(model, response) {
                    reverse_view_redirect('drafts.views.show', model.get('id'));
                },
                error: function(model, error) {
                    console.log(model.toJSON());
                    console.log('error saving');
                }
            });
        }
    });

    teoremer.AddCategoryView = Backbone.View.extend({
        // standard
        el: $('#modal-container'),
        events: {
            'click .cancel':             'remove',
            'click .btn-primary':        'addAction',
            'click #category-minus-btn': 'minusAction',
            'click #category-plus-btn':  'plusAction',
            'keypress input':            'keyPress',
            'hidden.bs.modal':           function() { this.remove(); }
        },
        initialize: function() {
            _.bindAll(this, 'render', 'renderTags', 'keyPress', 'addAction', 'minusAction', 'plusAction');
            this.collection = new TagList();
            this.collection.on('add remove', this.renderTags);
            this.render();
            this.setElement(this.$('.modal'));  // so 'this.remove' functions correctly
            this.$el.modal({ 'show': true });
            this.input_element = this.$('input');
            this.input_element.focus();
        },
        render: function() {
            var html = Handlebars.templates.add_category();
            this.$el.html(html);
        },
        // helpers
        renderTags: function() {
            var html = Handlebars.templates.tag_list({
                tags: this.collection.map(function(model) {
                    return model.typeset();
                })
            });
            this.$('div.category').html(html);
            MathJax.Hub.Queue(["Typeset", MathJax.Hub, this.$el.get()]);
        },
        keyPress: function(e) {
            if (e.keyCode == 13) {
                if (this.input_element.val()) {
                    this.plusAction();
                } else {
                    this.addAction();
                }
            }
        },
        addAction: function() {
            this.options.add(new Category({
                tag_list: this.collection
            }));
            this.$el.modal('hide');
        },
        minusAction: function() {
            if (!this.input_element.val()) {
                this.collection.pop();
            }
            this.input_element.val('').focus();
        },
        plusAction: function() {
            var value = this.input_element.val();
            if (value) {
                this.collection.push({
                    name: value
                });
            }
            this.input_element.val('').focus();
        }
    });

    var RemovableCategoryView = Backbone.View.extend({
        tagName: 'span',
        className: 'category',
        events: {
            'click .delete-category': 'remove'
        },
        initialize: function() {
            _.bindAll(this, 'render', 'unrender', 'remove');
            this.model.on('change', this.render);
            this.model.on('remove', this.unrender);
        },
        render: function() {
            var tag_html = this.model.typeset();
            this.$el.html(tag_html + ' <i class="icon-remove delete-category"></i>');
            return this;
        },
        unrender: function() {
            this.$el.remove();
        },
        remove: function() {
            this.model.destroy();
        }
    });

    teoremer.EditableCategoryListView = Backbone.View.extend({
        // standard
        events: function() {
            var e = {};
            e['click #category-add-' + this.uid] = '_promptCategory';
            return e;
        },
        initialize: function() {
            _.bindAll(this, 'render', '_addOne', '_promptCategory');
            this.uid = _.uniqueId();
            this.collection.bind('add', this._addOne);
            this.render();
        },
        render: function() {
            var html = Handlebars.templates.editable_category_list({
                uid: this.uid
            });
            this.$el.html(html);
            this.collection.each(this._addOne);
        },
        // helpers
        _addOne: function(item) {
            var categoryView = new RemovableCategoryView({
                model: item
            });
            this.$('#category-list-' + this.uid).append(categoryView.render().el);
            MathJax.Hub.Queue(["Typeset", MathJax.Hub, categoryView.$el.get()]);
        },
        _promptCategory: function() {
            var self = this;
            new teoremer.AddCategoryView({
                add: function(category) {
                    self.collection.add(category);
                }
            });
        }
    });

    var ChangableTagAssociationView = Backbone.View.extend({
        // standard
        tagName: 'tr',
        events: {
            'click button': '_change'
        },
        initialize: function() {
            _.bindAll(this, 'render', '_change');
            this.model.on('change', this.render);
        },
        render: function() {
            var html = Handlebars.templates.tag_association({
                tag: this.model.get('tag').typeset(),
                category: this.model.get('category').typeset()
            });
            this.$el.html(html);
            MathJax.Hub.Queue(["Typeset", MathJax.Hub, this.$el.get()]);
            return this;
        },
        // helpers
        _change: function() {
            var self = this;
            new teoremer.AddCategoryView({
                add: function(category) {
                    self.model.set('category', category);
                }
            });
        }
    });

    teoremer.ChangableTagAssociationListView = Backbone.View.extend({
        // standard
        initialize: function() {
            _.bindAll(this, 'render', '_addOne');
            this.collection.bind('add', this._addOne);
            this.render();
        },
        render: function() {
            var html = Handlebars.templates.tag_association_list();
            this.$el.html(html);
            this.collection.each(this._addOne);
        },
        // helpers
        _addOne: function(item) {
            var tagAssociation = new ChangableTagAssociationView({
                model: item
            });
            this.$('tbody').append(tagAssociation.render().el);
            MathJax.Hub.Queue(["Typeset", MathJax.Hub, tagAssociation.$el.get()]);
        }
    });

    teoremer.SaveFinalView = Backbone.View.extend({
        events: {
            'click': 'save'
        },
        initialize: function() {
            _.bindAll(this, 'save');
        },
        save: function() {
            this.model.save(null, {
                wait: true,
                success: function(model, response) {
                    reverse_view_redirect('items.views.show_final', model.get('id'));
                },
                error: function(model, error) {
                    console.log(model.toJSON());
                    console.log('error saving');
                }
            });
        }
    });

    var sourceFields = {
        'author':    { 'type': 'array',  'size': '2', 'maxlen': 255, 'name': 'Author' },
        'editor':    { 'type': 'array',  'size': '2', 'maxlen': 255, 'name': 'Editor' },
        'title':     { 'type': 'string', 'size': '4', 'maxlen': 255, 'name': 'Title'  },
        'publisher': { 'type': 'string', 'size': '2', 'maxlen': 255, 'name': 'Publisher' },
        'year':      { 'type': 'string', 'size': '1', 'maxlen': 32,  'name': 'Year' },
        'volume':    { 'type': 'string', 'size': '1', 'maxlen': 255, 'name': 'Volume' },
        'number':    { 'type': 'string', 'size': '1', 'maxlen': 255, 'name': 'Number' },
        'series':    { 'type': 'string', 'size': '2', 'maxlen': 255, 'name': 'Series' },
        'address':   { 'type': 'string', 'size': '2', 'maxlen': 255, 'name': 'Address' },
        'edition':   { 'type': 'string', 'size': '1', 'maxlen': 255, 'name': 'Edition' },
        'month':     { 'type': 'string', 'size': '1', 'maxlen': 255, 'name': 'Month' },
        'journal':   { 'type': 'string', 'size': '2', 'maxlen': 255, 'name': 'Journal' },
        'pages':     { 'type': 'string', 'size': '1', 'maxlen': 255, 'name': 'Pages' },
        'isbn10':    { 'type': 'string', 'size': '2', 'maxlen': 32,  'name': '10-digit ISBN' },
        'isbn13':    { 'type': 'string', 'size': '2', 'maxlen': 32,  'name': '13-digit ISBN' },
        'note':      { 'type': 'string', 'size': '4', 'maxlen': 255, 'name': 'Note' }
    };

    var sourceTypes = {
        'book': {
            'name':  'Book',
            'show':  ['author', 'title', 'publisher', 'year'],
            'extra': ['isbn10', 'isbn13', 'editor', 'volume', 'number', 'series', 'address', 'edition', 'month', 'note']
        },
        'article': {
            'name':  'Article',
            'show':  ['author', 'title', 'journal', 'year'],
            'extra': ['volume', 'number', 'pages', 'month', 'note']
        }
    };

    teoremer.SourceEditView = Backbone.View.extend({
        events: {
            'change #select-source': function() {
                this._setType(this.$('#select-source').val());
            },
            'click #extra-fields a': function(event) {
                this._addExtra($(event.currentTarget).data('key'));
            },
            'click #source-fields a': function(event) {
                var field_key = $(event.currentTarget).data('key');
                var value = this.model.has(field_key) ? this.model.get(field_key) : [''];
                this.model.set(field_key, value.concat(''));
                this.render();
            },
            'click #add-source': function() {
                var self = this;
                this.model.save(null, {
                    wait: true,
                    success: function(model, response) {
                        if (self.options.mode[0] == 'item') {
                            reverse_view_redirect('sources.views.add_location_for_item',
                                                  self.options.mode[1], model.get('id'));
                        } else if (self.options.mode[0] == 'draft') {
                            reverse_view_redirect('sources.views.add_location_for_draft',
                                                  self.options.mode[1], model.get('id'));
                        } else {
                            reverse_view_redirect('sources.views.index');
                        }
                    },
                    error: function(model, error) {
                        console.log(model.toJSON());
                        console.log('error saving source');
                    }
                });
            }
        },
        initialize: function() {
            _.bindAll(this, 'render', '_setType', '_updateModel', '_addExtra');
            this.$el.on('input propertychange', this._updateModel);
            this._setType(this.model.get('type'));
        },
        _setType: function(type) {
            var attrs = cleanValues(this.model.attributes);
            attrs.type = type;
            this.model.clear({ 'silent': true });
            this.model.set(attrs);
            this.render();
        },
        _addExtra: function(name) {
            var v = sourceFields[name].type == 'array' ? [''] : '';
            this.model.set(name, v);
            this.render();
        },
        render: function() {
            var type = this.model.get('type');

            var type_data = sourceTypes[type];
            var extras_to_show = _.filter(type_data.extra, function(element) {
                return this.model.has(element);
            }, this);

            var html = Handlebars.templates.source_edit({
                'types': _.map(sourceTypes, function(value, key) {
                    return { 'key': key, 'name': sourceTypes[key].name };
                }),
                'extra': _.map(_.difference(type_data.extra, extras_to_show), function(key) {
                    return { 'key': key, 'name': sourceFields[key].name };
                })
            });
            this.$el.html(html);

            this.$('#select-source').val(type);

            var source_fields_element = this.$('#source-fields');
            var show = _.union(type_data.show, extras_to_show);

            _.each(show, function(field_key) {
                var field_config = sourceFields[field_key];
                var data = {
                    'id':    field_key,
                    'name':  field_config.name,
                    'size':  field_config.size,
                    'max':   field_config.maxlen,
                    'value': this.model.has(field_key) ? this.model.get(field_key)
                                                         : (field_config.type == 'array' ? [''] : '')
                };
                if (field_config.type == 'string') {
                    source_fields_element.append(Handlebars.templates.source_string_field(data));
                } else if (field_config.type == 'array') {
                    source_fields_element.append(Handlebars.templates.source_array_field(data));
                }
            }, this);

           this.delegateEvents();
        },
        _updateModel: function() {
            var view = this, key, value;
            view.$('input').each(function() {
                key = $(this).attr('id').slice(6);
                if (key.match(/^[a-z]+$/)) {
                    value = $(this).val();
                    value ? view.model.set(key, value) : view.model.unset(key);
                } else if (key.match(/^[a-z]+0$/)) {
                    key = key.slice(0, -1);
                    var idBase = '#input-' + key;
                    value = [];
                    for (var j=0;; j++) {
                        var elem = $(idBase + j), v;
                        if (!elem.length) break;
                        v = elem.val();
                        if (v) value.push(v);
                    }
                    value.length ? view.model.set(key, value) : view.model.unset(key);
                }
            });
        }
    });

    teoremer.SourceRenderView = Backbone.View.extend({
        initialize: function() {
            _.bindAll(this, 'render');
            this.model.on('change', this.render);
            this.render();
        },
        render: function() {
            this.$el.html(typeset_source(this.model.attributes));
        }
    });

    var SourceSearchItemView = Backbone.View.extend({
        tagName: 'a',
        className: 'list-group-item',
        attributes: function() {
            var url = '#';
            if (this.options.mode[0] == 'item') {
                url = reverse_view('sources.views.add_location_for_item', this.options.mode[1], this.model.get('id'));
            } else if (this.options.mode[0] == 'draft') {
                url = reverse_view('sources.views.add_location_for_draft', this.options.mode[1], this.model.get('id'));
            } 
            return { 'href': url };
        },
        initialize: function() {
            _.bindAll(this, 'render');
            this.render();
        },
        render: function() {
            this.$el.html(Handlebars.templates.source_search_item({
                'source': typeset_source(this.model.attributes)
            }));
            return this;
        }
    });

    teoremer.LiveSourceSearchView = Backbone.View.extend({
        initialize: function() {
            _.bindAll(this, 'render', '_search', '_check', '_cancelTimer', '_addOne');
            this.options.sourceModel.on('change', this._check);
            this.collection = new Backbone.Collection;
            this.collection.url = api_prefix + 'source/search';
            this.collection.on('reset', this.render);
            this.collection.on('add', this._addOne);
            this.render();
            this._search();
        },
        render: function() {
            this.$el.html(Handlebars.templates.source_search_container());
            this.collection.each(this._addOne);
        },
        _addOne: function(item) {
            var itemView = new SourceSearchItemView({ model: item, mode: this.options.mode });
            this.$('div').append(itemView.render().el);
        },
        _search: function() {
            this._cancelTimer();
            var attrs = cleanValues(this.options.sourceModel.attributes);
            for (var key in attrs) {
                if (_.isArray(attrs[key])) {
                    attrs[key] = JSON.stringify(attrs[key]);
                }
            }
            if (_.isEmpty(_.pick(attrs, 'author', 'title'))) {
                this.collection.reset();
            } else {
                this.collection.fetch({ 'data': attrs, 'reset': true });
            }
        },
        _check: function() {
            this._cancelTimer();
            this.timeoutID = window.setTimeout(this._search, 1000);
        },
        _cancelTimer: function() {
            if (typeof this.timeoutID == "number") {
                window.clearTimeout(this.timeoutID);
                delete this.timeoutID;
            }
        }
    });

    var ValidationView = Backbone.View.extend({
        tagName: 'li',
        className: 'list-group-item',
        initialize: function() {
            _.bindAll(this, 'render');
            this.render();
        },
        render: function() {
            this.$el.html(Handlebars.templates.validation_item({
                'source': typeset_source(this.model.get('source')),
                'location': this.model.get('location')
            }));
            return this;
        }
    });

    teoremer.ValidationListView = Backbone.View.extend({
        // standard
        initialize: function() {
            _.bindAll(this, 'render', '_addOne');
            this.collection.bind('add', this._addOne);
            this.render();
        },
        render: function() {
            this.$el.html(Handlebars.templates.validation_list());
            this.collection.each(this._addOne);
        },
        // helpers
        _addOne: function(item) {
            var validationView = new ValidationView({ model: item });
            this.$('ul').append(validationView.render().el);
        }
    });

    window.teoremer = teoremer;

})(window);

// on load actions

$(function() {

    function expanderToggle(elem) {
        elem.toggleClass('expander-in').toggleClass('expander-out');
        elem.find('span.glyphicon').toggleClass('glyphicon-chevron-down').toggleClass('glyphicon-chevron-up');
        elem.next().toggle();
    }

    $('.expander-in').each(function() {
        $(this).next().hide();
        $(this).find('span.glyphicon').addClass('glyphicon-chevron-down');
    }).click(function() {
        expanderToggle($(this));
    });

    $('expander-out').each(function() {
        $(this).find('span.glyphicon').addClass('glyphicon-chevron-up');
        $(this).next().show();
    }).click(function() {
        expanderToggle($(this));
    });

    $(function() {
        $('input[type="text"]').first().focus();
    });

});