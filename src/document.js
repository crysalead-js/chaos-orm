var co = require('co');
var throttle = require('throttleit');
var Emitter = require('component-emitter');
var dotpath = require('dotpath-parser');
var extend = require('extend-merge').extend;
var merge = require('extend-merge').merge;
var expand = require('expand-flatten').expand;
var flatten = require('expand-flatten').flatten;
var Validator = require('chaos-validator').Validator;
var Conventions = require('./conventions');
var Collection = require('./collection/collection');
var Through = require('./collection/through');

class Document {

  /**
   * Registers a document dependency
   * (temporarily solve node circular dependency issue, will be removed once ES2015 modules will be supported).
   *
   * @param  String   name      The dependency name.
   * @param  Function document The class document to register.
   * @return Object             Returns `this`.
   */
  static register(name, document) {
    if (arguments.length === 2) {
      this._registered[name] = document;
      return this;
    }
    this._name = name !== undefined ? name : this.name;
    this._registered[this._name] = this;
    return this;
  }

  /**
   * Returns a registered document dependency.
   * (temporarily solve node circular dependency issue, will be removed once ES2015 modules will be supported).
   *
   * @param  String   name The field name.
   * @return Function       Returns `this`.
   */
  static registered(name) {
    if (!arguments.length) {
      return Object.keys(this._registered);
    }
    if (this._registered[name] === undefined) {
      throw new Error("Undefined `" + name + "` as document dependency, the document need to be registered first.");
    }
    return this._registered[name];
  }

  /**
   * Gets/sets classes dependencies.
   *
   * @param  Object classes The classes dependencies to set or none to get it.
   * @return mixed          The classes dependencies.
   */
  static classes(classes) {
    if (arguments.length) {
      this._classes = extend({}, this._classes, classes);
    }
    return extend({}, this._classes);
  }

  /**
   * Gets/sets the conventions object to which this class is bound.
   *
   * @param  Object conventions The conventions instance to set or none to get it.
   * @return mixed              The conventions instance.
   */
  static conventions(conventions) {
    if (arguments.length) {
      this._conventions = conventions;
      return this;
    }
    if (!this._conventions) {
      conventions = this.classes().conventions;
      this._conventions = new conventions();
    }
    return this._conventions;
  }

  /**
   * Gets the Document schema definition.
   *
   * @return Object The schema instance.
   */
  static definition() {
    var schema = new this._definition({
      classes: extend({}, this.classes(), { entity: Document }),
      conventions: this.conventions(),
      class: Document
    });
    schema.lock(false);
    this._define(schema);
    return schema;
  }

  /**
   * This function called once for initializing the model's schema.
   *
   * Example of schema initialization:
   * ```php
   * schema.column('id', { type: 'id' });
   *
   * schema.column('title', { type: 'string', 'default': true });
   *
   * schema.column('body', { type: 'string' });
   *
   * // Custom object
   * schema.column('comments',       { type: 'object', array: true, 'default': [] });
   * schema.column('comments.id',    { type: 'id' });
   * schema.column('comments.email', { type: 'string' });
   * schema.column('comments.body',  { type: 'string' });
   *
   * // Custom object with a dedicated class
   * schema.column('comments', {
   *    type: 'entity',
   *    class: Comment,
   *    array: true,
   *    default: []
   * });
   *
   * schema.hasManyThrough('tags', 'post_tag', 'tag');
   *
   * schema.hasMany('post_tag', PostTag, { keys: { id: 'post_id' } });
   * ```
   *
   * @param Object $schema The schema instance.
   */
  static _define(schema) {
  }

  /**
   * Get/set the unicity .
   *
   * @return boolean
   */
  static unicity(enable) {
    return false;
  }

  /**
   * Instantiates a new record or document object, initialized with any data passed in. For example:
   *
   * ```php
   * var post = Post.create({ title: 'New post' });
   * echo post.get('title'); // echoes 'New post'
   * var success = post.save();
   * ```
   *
   * Note that while this method creates a new object, there is no effect on the database until
   * the `save()` method is called.
   *
   * In addition, this method can be used to simulate loading a pre-existing object from the
   * database, without actually querying the database:
   *
   * ```php
   * var post = Post::create({ id: id, moreData: 'foo' }, { exists: true });
   * post.set('title', 'New title');
   * var success = post.save();
   * ```
   *
   * @param  Object data    Any data that this object should be populated with initially.
   * @param  Object options Options to be passed to item.
   *                        - `'type'`  _String_   : can be `'entity'` or `'set'`. `'set'` is used if the passed data represent a collection
   *                                                     of entities. Default to `'entity'`.
   *                        - `'class'` _Function_ : the class document to use to create entities.
   * @return Object         Returns a new, un-saved record or document object. In addition to
   *                        the values passed to `data`, the object will also contain any values
   *                        assigned to the `'default'` key of each field defined in the schema.
   */
  static create(data, options)
  {
    var defaults = {
      type: 'entity',
      class: this
    };

    options = Object.assign(defaults, options);

    var type = options.type;
    var classname;

    if (type === 'entity') {
      classname = options.class;
    } else {
      options.schema = this.definition();
      classname = this._classes[type];
    }

    options.data = data;
    return new classname(options);
  }

  /***************************
   *
   *  Document related methods
   *
   ***************************/
  /**
   * Creates a new record object with default values.
   *
   * @param array $config Possible options are:
   *                      - `'schema'`     _Object_  : The schema instance.
   *                      - `'basePath'`   _String_  : A dotted field names path (for embedded entities).
   *                      - `'defaults'`   _Boolean_ : Populates or not the fields default values.
   *                      - `'data'`       _Array_   : The entity's data.
   *
   */
  constructor(config) {
    var defaults = {
      schema: undefined,
      basePath: undefined,
      defaults: true,
      data: {}
    };
    config = Object.assign(defaults, config);

    /**
     * Contains the values of updated fields.
     *
     * @var Object
     */
    this._data = {};

    /**
     * Loaded data on construct.
     *
     * @var Object
     */
    this._original = {};

    /**
     * The list of validation errors associated with this object, where keys are field names, and
     * values are arrays containing one or more validation error messages.
     *
     * @var Object
     */
    this._errors = {};

    /**
     * A reference to `Document`'s parents object.
     *
     * @var Object
     */
    this._parents = new Map();

    /**
     * A reference to `Document`'s watches.
     *
     * @var Map
     */
    this._watches = new Map();

    this._emit = throttle(function(type, value, mode) {
      this.emit(type, value, mode);
    }, 10);

    /**
     * If this instance has a parent, this value indicates the parent field path.
     *
     * @var String
     */
    this.basePath(config.basePath);

    this.schema(config.schema);

    if (config.defaults) {
      config.data = Object.assign(this.schema().defaults(config.basePath), config.data);
    }

    var data = config.data;
    if (typeof data !== 'object' || data.constructor !== Object) {
      throw new Error("The `'data'` option need to be a valid plain object.");
    }

    /**
     * Related to the Model constructor.
     * However `this` is not available before super(), so leave this definition here.
     */
    this._exists = config.exists;

    this._triggerEnabled = false;
    this.set(data);
    this._triggerEnabled = true;

    this._exists = this._exists === 'all' ? true : this._exists;

    this._original = Object.assign({}, this._data);
  }

  /**
   * Returns the document's class.
   *
   * @return Function
   */
  self() {
    return this.constructor;
  }

  /**
   * Gets/sets the schema instance.
   *
   * @param  Object schema The schema instance to set or none to get it.
   * @return mixed         The schema instance on get or `this` otherwise.
   */
  schema(schema) {
    if (arguments.length) {
      this._schema = schema;
      return this;
    }
    if (!this._schema) {
      this._schema = this.constructor.definition();
    }
    return this._schema;
  }

  /**
   * Get parents.
   *
   * @return Map Returns the parents map.
   */
  parents() {
    return new Map(this._parents);
  }

  /**
   * Set a parent.
   *
   * @param  Object parent The parent instance to set.
   * @param  String from   The parent from field to set.
   * @return self
   */
  setParent(parent, from) {
    this._parents.set(parent, parent instanceof Document ? from : '*');
    return this;
  }

  /**
   * Unset a parent.
   *
   * @param  Object parent The parent instance to remove.
   * @return self
   */
  unsetParent(parent) {
    this._parents.delete(parent);
    return this;
  }

  /**
   * Disconnect the document from its graph (i.e parents).
   * Note: It has nothing to do with persistance
   *
   * @return self
   */
  disconnect() {
    var parents = this._parents;
    for (var object of parents.keys()) {
      var path = parents.get(object);
      if (object instanceof Document) {
        object.unset(path);
      } else if (object instanceof Collection) {
        for (var i = 0, len = object.length; i < len; i++) {
          if (object.get(i) === this) {
            object.unset(i);
            break;
          }
        }
      }
    }
    return this;
  }

  /**
   * Gets/sets the basePath (embedded entities).
   *
   * @param  String basePath The basePath value to set or `null` to get the current one.
   * @return mixed           Returns the basePath value on get or `this` otherwise.
   */
  basePath(basePath) {
    if (arguments.length) {
      this._basePath = basePath;
      return this;
    }
    return this._basePath;
  }

  /**
   * Returns the current data.
   *
   * @param  String   name         If name is defined, it'll only return the field value.
   * @param  Function fetchHandler The fetching handler.
   * @return mixed.
   */
  get(name, fetchHandler) {
    if (!arguments.length) {
      var fields = Object.keys(this._data);
      var result = {};
      for (var field of fields) {
        result[field] = this.get(field);
      }
      return result;
    }
    var keys = Array.isArray(name) ? name.slice() : dotpath(name);
    name = keys.shift();
    if (name == null || name === '') {
      throw new Error("Field name can't be empty.");
    }

    if (keys.length) {
      var value = this.get(name);
      if (!value) {
        return null;
      }
      if (value.set === undefined) {
        throw new Error("The field: `" + name + "` is not a valid document or entity.");
      }
      return value.get(keys);
    }

    var fieldName = this.basePath() ? this.basePath() + '.' + name : String(name);
    var schema = this.schema();

    var field = {};

    if (schema.has(fieldName)) {
      field = schema.column(fieldName);
    } else {
      var genericFieldName = this.basePath() ? this.basePath() + '.*' : '*';
      if (schema.has(genericFieldName)) {
        field = schema.column(genericFieldName);
        fieldName = genericFieldName;
      } else if (schema.locked() && !schema.hasRelation(fieldName, false)) {
        throw new Error("Missing schema definition for field: `" + fieldName + "`.");
      }
    }

    var autoCreate = !!field.array;
    var value = field.array ? [] : {};

    if (typeof field.getter === 'function') {
      var data = field.getter(this, this._data[name], name);
      if (field.type) {
        data = schema.convert('cast', field.type, data, field);
      }
      return data;
    } else if (this._data[name] !== undefined) {
      return this._data[name];
    } else if(schema.hasRelation(fieldName, false)) {
      var relation = schema.relation(fieldName);
      var hasManyThrough = relation.type() === 'hasManyThrough';
      if (!hasManyThrough || (this.id() != null && !this.has(relation.through()))) {
        var belongsTo = relation.type() === 'belongsTo';
        var foreignKey = belongsTo ? this.get(relation.keys('from')) : null;
        if ((this._exists !== false && !belongsTo) || foreignKey !== null) {
          if (fetchHandler) {
            return fetchHandler(this, name);
          } else if (this.constructor.unicity() && foreignKey !== null) {
            var model = relation.to();
            if (model.shard().has(foreignKey)) {
              this._data[name] = model.shard().get(foreignKey);
              return this._data[name];
            }
          }
          throw new Error("The relation `'" + name + "'` is an external relation, use `fetch()` to lazy load its data.");
        }
      }
      autoCreate = relation.isMany();
      value = hasManyThrough ? null : [];
    } else if (field.default) {
      autoCreate = true;
      value = field.default;
    }

    if (autoCreate) {
      this._set(name, value);
      return this._data[name];
    }
    return null;
  }

  /**
   * Sets one or several properties.
   *
   * @param  mixed   name   A dotted field name or an associative array of fields and values.
   * @param  Array   data   An associative array of fields and values or an options array.
   * @return self           Returns `this`.
   */
  set(name, data) {
    if (typeof name === 'string' || Array.isArray(name)) {
      this._set(name, data);
      return this;
    }
    data = name || {};
    if (data === null || typeof data !== 'object' || data.constructor !== Object) {
      throw new Error('A plain object is required to set data in bulk.');
    }
    for (var name in data) {
      this._set(name, data[name]);
    }
    return this;
  }

  /**
   * Helper for the `set()` method.
   *
   * Ps: it allow to use scalar datas for relations. Indeed, on form submission relations datas are
   * provided by a select input which generally provide such kind of array:
   *
   * ```php
   * var array = {
   *     id: 3
   *     comments: [
   *         '5', '6', '9
   *     ]
   * };
   * ```
   *
   * To avoid painfull pre-processing, this function will automagically manage such relation
   * array by reformating it into the following on autoboxing:
   *
   * ```php
   * var array = [
   *     id: 3
   *     comments: [
   *         { id: '5' },
   *         { id: '6' },
   *         { id: '9' }
   *     ],
   * ];
   * ```
   *
   * @param mixed   name   A dotted field name or an array of field names.
   * @param Array   data   An associative array of fields and values or an options array.
   */
  _set(name, data) {
    var keys = Array.isArray(name) ? name.slice() : dotpath(name);
    var name = keys[0];

    if (name == null || name === '') {
      throw new Error("Field name can't be empty.");
    }

    if (keys.length > 1) {
      var path = keys.slice();
      path.shift();
      if (this.get(name) == undefined) {
        this._set(name, { [path.join('.')]: data });
      }
      var value = this._data[name];
      if (!value || value.set === undefined) {
        throw new Error("The field: `" + name + "` is not a valid document or entity.");
      }
      value.set(path, data);
      this._applyWatch(keys);
      return;
    }

    var schema = this.schema();
    name = String(name);
    var previous = this._data[name];
    var value = schema.cast(name, data, {
      parent: this,
      basePath: this.basePath(),
      defaults: true,
      exists: this._exists === 'all' ? 'all' : null
    });
    if (previous === value) {
      this._applyWatch(name);
      return;
    }
    var fieldName = this.basePath() ? this.basePath() + '.' + name : name;

    this._data[name] = value;

    if (schema.isVirtual(fieldName)) {
      return;
    }

    if (schema.hasRelation(fieldName, false)) {
      var relation = schema.relation(fieldName);
      if (relation.type() === 'belongsTo') {
        this._set(relation.keys('from'), value ? value.id() : null);
      }
    }

    if (value && typeof value.setParent === 'function') {
      value.setParent(this, name);
    }

    if (previous && typeof previous.unsetParent === 'function') {
      previous.unsetParent(this);
    }
    this._applyWatch(name);
    this.trigger('modified', this, true);
  }

  /**
   * Trigger an event through the graph.
   *
   * @param String type   The type of event.
   * @param mixed  value  The modified data.
   * @param String mode   The modification type.
   * @param Map    ignore The ignore Map.
   */
  trigger(type, value, mode, ignore) {
    if (!this._triggerEnabled) {
      return;
    }
    ignore = ignore || new Map();

    if (ignore.has(this)) {
        return;
    }
    ignore.set(this, true);

    for (var [parent, field] of this._parents) {
      parent.trigger(type, value, mode, ignore);
    }
    if (Document.emitEnabled) {
      this._emit('modified', value, mode);
    }
  }

  /**
   * Watch a path
   *
   * @param  String   path    The path.
   * @param  Function closure The closure to run.
   * @return self
   */
  watch(path, closure) {
    var keys = [];
    if (arguments.length === 1) {
      closure = path;
      path = '';
    } else {
      keys = Array.isArray(path) ? path : dotpath(path);
    }

    if (!this._watches.has(path)) {
      this._watches.set(path, new Map());
    }

    var watches = this._watches.get(path);

    if (watches.has(closure)) {
      this.unwatch(path, closure);
    }

    var handler = (path) => {
      if (keys.every(function(value, i) {
        return path[i] !== undefined && value === path[i];
      })) {
        closure(path);
      }
    };
    watches.set(closure, handler);
    return this;
  }

  /**
   * Unwatch a path
   *
   * @param String   path    The path.
   * @param Function closure The closure to unwatch.
   * @return self
   */
  unwatch(path, closure) {
    if (arguments.length === 1) {
      closure = path;
      path = '';
    }

    if (!this._watches.has(path)) {
      return this;
    }

    var watches = this._watches.get(path);

    if (!watches.has(closure)) {
      return this;
    }
    watches.delete(closure);
    return this;
  }

  /**
   * Apply watches
   *
   * @param String path The modified path.
   */
  _applyWatch(path) {
    if (this._watches.size) {
      this._watches.forEach(function(watches) {
        watches.forEach(function(handler) {
          handler(path);
        });
      });
    }
  }

  /**
   * Checks if property exists.
   *
   * @param String name A field name.
   */
  has(name) {
    var keys = Array.isArray(name) ? name.slice() : dotpath(name);
    if (!keys.length) {
      return;
    }

    var name = keys.shift();
    if (keys.length) {
      var value = this.get(name);
      return value && value.has !== undefined ? value.has(keys) : false;
    }
    return this._data[name] !== undefined;
  }

  /**
   * Unset a property.
   *
   * @param String name A field name.
   */
  unset(name) {
    var keys = Array.isArray(name) ? name.slice() : dotpath(name);
    if (!keys.length) {
      return;
    }

    var name = keys[0];
    if (keys.length > 1) {
      var path = keys.slice();
      path.shift();
      var value = this.get(name);
      if (value instanceof Document) {
        value.unset(path);
      }
      this._applyWatch(keys);
      return;
    }
    var value = this._data[name];
    if (value && typeof value.unsetParent === 'function') {
      value.unsetParent(this);
    }
    this._applyWatch(name);
    if (this._data[name] !== undefined) {
      delete this._data[name];
      this.trigger('modified', value, false);
    }
    return this;
  }

  /**
   * Exports the entity into an array based representation.
   *
   * @param  Object options Some exporting options. Possibles values are:
   *                        - `'embed'` _array_: Indicates the relations to embed for the export.
   * @return mixed          The exported result.
   */
  data(options) {
    return this.to('array', options);
  }

  /**
   * Returns the original data (i.e the data in the datastore) of the entity.
   *
   * @param  string field A field name or nothing to get all original data.
   * @return mixed
   */
  original(field) {
    if (!arguments.length) {
      return extend({}, this._original);
    }
    return this._original[field];
  }

  /**
   * Gets the modified state of a given field or, if no field is given, gets the state of the whole entity.
   *
   * @param  String|Object field The field name to check or an options object.
   * @return Array               Returns `true` if a field is given and was updated, `false` otherwise.
   *                             If the `'return'` options is set to true, returns an array of all modified fields.
   */
  modified(field) {
    var schema = this.schema();
    var options = {
      embed: false,
      return: false,
      ignore: []
    };

    if (field && typeof field === 'object') {
      extend(options, field);
      field = undefined;

      if (options.embed === true) {
        options.embed = this.hierarchy();
      }
    }

    options.embed = schema.treeify(options.embed);

    var updated = {};
    var fields = field ? [field] : Object.keys(extend({}, this._original, this._data));

    var len = fields.length;
    for (var i = 0; i < len; i++) {
      var key = fields[i];

      if (!this._data.hasOwnProperty(key)) {
        if (this._original.hasOwnProperty(key)) {
          updated[key] = this._original[key];
        }
        continue;
      }

      var value = this._data[key];

      if (schema.hasRelation(key, false)) {
        var relation = schema.relation(key);
        if (relation.type() !== 'hasManyThrough' && options.embed[key] !== undefined) {
          if (!this._original.hasOwnProperty(key)) {
            updated[key] = null;
          } else {
            var original = this._original[key];
            if (value !== original) {
              updated[key] = original ? original.original() : original;
            } else if (value && value.modified(options.embed[key] || {})) {
              updated[key] = value.original();
            }
          }
        }
        continue;
      } else if (!this._original.hasOwnProperty(key)) {
        updated[key] = null;
        continue;
      }

      var original = this._original[key];
      var modified = false;

      if (value && typeof value.modified === 'function') {
        modified = original !== value || value.modified(options);
      } else {
        modified = original !== value;
      }
      if (modified) {
        updated[key] = original;
      }
    }
    if (options.ignore) {
      options.ignore = Array.isArray(options.ignore) ? options.ignore : [options.ignore];
      for (var name of options.ignore) {
        delete updated[name];
      }
    }
    var result = Object.keys(updated);
    return options.return ? result : result.length !== 0;
  }

  /**
   * Amend the document modifications.
   *
   * @return self
   */
  amend() {
    this._original = extend({}, this._data);

    var schema = this.schema();
    var fields = Object.keys(this._original);

    var len = fields.length;
    for (var i = 0; i < len; i++) {
      var key = fields[i];
      if (schema.hasRelation(key, false)) {
        continue;
      }
      var value = this._original[key];
      if (value && typeof value.amend === 'function') {
        value.amend();
      }
    }
    return this;
  }

  /**
   * Restore a document to its original values.
   *
   * @return self
   */
  restore() {
    var names = [];
    var fields = Object.keys(extend({}, this._original, this._data));
    for (var field of fields) {
      if (this.modified(field)) {
        names.push(field);
      }
    }
    this._data = extend({}, this._original);
    for (var name of names) {
      this._applyWatch(name);
    }
    this.trigger('modified');
    return this;
  }

  /**
   * Returns all included relations accessible through this entity.
   *
   * @param  String      prefix The parent relation path.
   * @param  Map         ignore The already processed entities to ignore (address circular dependencies).
   * @param  Boolean     index  Returns an indexed array or not.
   * @return Array|false        The included relations.
   */
  hierarchy(prefix, ignore, index) {
    prefix = prefix || '';
    ignore = ignore || new Map();

    if (ignore.has(this)) {
      return false;
    }
    ignore.set(this, true);

    var tree = this.schema().relations();
    var result = {};
    var habtm = {};
    var key;
    var path;

    for (var field of tree) {
      var rel = this.schema().relation(field);
      if (rel.type() === 'hasManyThrough') {
        habtm[field] = rel;
        continue;
      }
      if (!this.has(field)) {
        continue;
      }
      var entity = this.get(field);
      if (entity) {
        path = prefix ? prefix + '.' + field : field;
        var children = entity.hierarchy(path, ignore, true);
        if (Object.keys(children).length) {
          for (key in children) {
            if (!result.hasOwnProperty(key)) {
              result[key] = key;
            }
          }
        } else if (children !== false) {
          result[path] = path;
        }
      }
    }

    for (var field in habtm) {
      var rel = habtm[field];
      var using = rel.through() + '.' + rel.using();
      path = prefix ? prefix + '.' + using : using;
      for (key in result) {
        if (key.indexOf(path) === 0) {
          path = prefix ? prefix + '.' + field : field;
          result[path] = path;
        }
      }
    }
    return index ? result : Object.keys(result);
  }

  /**
   * Converts the data in the record set to a different format, i.e. json.
   *
   * @param String format  The format.
   * @param Object options Options for converting:
   *                        - `'indexed'` _boolean_: Allows to control how converted data of nested collections
   *                        is keyed. When set to `true` will force indexed conversion of nested collection
   *                        data. By default `false` which will only index the root level.
   * @return mixed
   */
  to(format, options) {
    var defaults = {
      embed: true,
      basePath: this.basePath()
    };

    options = extend({}, defaults, options);

    if (options.embed === true) {
      options.embed = this.hierarchy();
    }

    var schema = this.schema();

    var embed = schema.treeify(options.embed);

    var result = {};
    var basePath = options.basePath;

    var fields;
    if (schema.locked()) {
      fields = schema.fields(options.basePath).concat(schema.relations());
      if (fields.indexOf('*') !== -1) {
        fields = Object.keys(this._data);
      }
    } else {
      fields = Object.keys(this._data);
    }

    for (var field of fields) {
      if (schema.isPrivate(field)) {
        continue;
      }
      var path = basePath ? basePath + '.' + field : field;
      options.embed = false;

      var key = field;

      if (schema.hasRelation(path, false)) {
        if (embed[field] === undefined) {
          continue;
        }
        extend(options, embed[field]);
        var rel = schema.relation(path);
        if (rel.type() === 'hasManyThrough') {
          key = rel.through();
        }
      }
      if (!this.has(key)) {
        continue;
      }

      var value = this.get(field);

      if (value instanceof Document || (value && value.forEach instanceof Function)) {
        options.basePath = value.basePath();
        if (schema.has(path)) {
          result[field] = schema.format(format, path, value);
        } else {
          result[field] = value.to(format, options);
        }
      } else {
        options.basePath = path;
        result[field] = schema.has(options.basePath) ? schema.format(format, options.basePath, value) : value;
      }
    }
    return result;
  }
}

/**
 * Registered documents
 * (temporarily solve node circular dependency issue, will be removed once ES2015 modules will be supported).
 */
Document._registered = {};

/**
 * Class dependencies.
 *
 * @var Object
 */
Document._classes = {
  set: Collection,
  through: Through,
  conventions: Conventions
}

/**
 * Boolean indicated if some event should be triggered on modification.
 *
 * @ Boolean
 */
Document.emitEnabled = true;

/**
 * Document conventions.
 *
 * @var Object A naming conventions.
 */
Document._conventions = undefined;

/**
 * Document schema.
 *
 * @var Function
 */
Document._definition = undefined;

Emitter(Document.prototype);

module.exports = Document;
