import co from 'co';
import { extend, merge } from 'extend-merge';
import { expand, flatten } from 'expand-flatten';
import intersect from 'intersect';
import dateFormat from 'dateformat-light';
import Document from './document';
import Conventions from './conventions';
import Collection from "./collection/collection";
import Through from "./collection/through";
import Relationship from './relationship';
import BelongsTo from './relationship/belongs-to';
import HasOne from './relationship/has-one';
import HasMany from './relationship/has-many';
import HasManyThrough from './relationship/has-many-through';

function normalize(array) {
  var i, len, key, result = {};

  if (typeof array === 'string') {
    array = [array];
  }

  if (!Array.isArray(array)) {
    if (!array || typeof array !== 'object') {
      throw new Error("Invalid passed parameter, can't be normalized.")
    }
    return array;
  }

  len = array.length;
  for (i = 0; i < len; i++) {
    if (typeof array[i] !== 'object') {
      result[array[i]] = null;
      continue;
    }
    if (!array[i]) {
      continue;
    }
    for (key in array[i]) {
      result[key] = array[i][key];
    }
  }
  return result;
}

class Schema {

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
    return this._classes;
  }

  /**
   * Configures the meta for use.
   *
   * @param Object config Possible options are:
   *                      - `'connection'`  _Function_ : The connection instance (defaults to `undefined`).
   *                      - `'source'`      _String_   : The source name (defaults to `undefined`).
   *                      - `'model'`       _Function_ : The fully namespaced model class name (defaults to `undefined`).
   *                      - `'locked'`      _Boolean_  : set the ability to dynamically add/remove fields (defaults to `false`).
   *                      - `'key'`         _String_   : The primary key value (defaults to `id`).
   *                      - `'columns'`     _Array_    : array of field definition where keys are field names and values are arrays
   *                                                     with the following keys. All properties are optionnal except the `'type'`:
   *                                                     - `'type'`       _string_ : the type of the field.
   *                                                     - `'default'`    _mixed_  : the default value.
   *                                                     - `'null'`       _boolean_: allow null value (default to `'true'` excpect for serial).
   *                                                     - `'length'`     _integer_: the length of the data.
   *                                                     - `'precision'`  _integer_: the precision (for decimals).
   *                                                     - `'use'`        _string_ : the database type to override the associated type for this type.
   *                                                     - `'serial'`     _string_ : autoincremented field.
   *                                                     - `'primary'`    _boolean_: primary key.
   *                                                     - `'array'`      _boolean_ : if the field is a collection (default to `'false'`).
   *                      - `'meta'`        _Object_   : array of meta definitions for the schema. The definitions are related to
   *                                                    the datasource. For the MySQL adapter the following options are available:
   *                                                    - `'charset'`    _string_: the charset value to use for the table.
   *                                                    - `'collate'`    _string_: the collate value to use for the table.
   *                                                    - `'engine'`     _stirng_: the engine value to use for the table.
   *                                                    - `'tablespace'` _string_: the tablespace value to use for the table.
   *                      - `'handlers'`    _Object_   : casting handlers.
   *                      - `'conventions'` _Function_ : The naming conventions instance.
   *                      - `'classes'`     _Object_   : The class dependencies.
   */
  constructor(config) {
    var defaults = {
      connection: undefined,
      source: undefined,
      model: Document,
      locked: true,
      columns: [],
      meta: {},
      handlers: {},
      conventions: undefined,
      classes: extend({}, this.constructor.classes())
    };

    config = merge({}, defaults, config);

    /**
     * The class dependencies.
     *
     * @var Object
     */
    this._classes = config.classes;

    /**
     * The connection instance.
     *
     * @var Object
     */
    this._connection = config.connection;

    /**
     * Indicates whether the schema is locked or not.
     *
     * @var Boolean
     */
    this._locked = config.locked;

    /**
     * The schema meta data.
     *
     * @var Object
     */
    this._meta = config.meta;

    /**
     * Casting handlers.
     *
     * @var Object
     */
    this._handlers = extend({}, config.handlers, this._handlers());

    /**
     * The conventions instance.
     *
     * @var Object
     */
    this._conventions = config.conventions ? config.conventions : new Conventions();

    /**
     * The fields.
     *
     * @var Object
     */
    this._columns = new Map();

    /**
     * The source name.
     *
     * @var String
     */
    this._source = config.source;

    /**
     * The model to which this schema is bound.
     *
     * @var Function
     */
    this._model = config.model;

    /**
     * The primary key field name.
     *
     * @var String
     */
    config.key = config.key !== undefined ? config.key : this._conventions.apply('key');
    this._key = config.key;

    /**
     * Relations configuration.
     *
     * @var Object
     */
    this._relations = {};

    /**
     * Loaded relationships.
     *
     * @var Object
     */
    this._relationships = {};

    /**
     * Formatters.
     *
     * @var Object
     */
    this._formatters = {};

    var key, handlers;

    for(var column of config.columns) {
      var key = Object.keys(column)[0];
      this._columns.set(key, this._initColumn(column[key]));
    }

    handlers = this._handlers;

    this.formatter('array', 'id',        handlers['array']['integer']);
    this.formatter('array', 'serial',    handlers['array']['integer']);
    this.formatter('array', 'integer',   handlers['array']['integer']);
    this.formatter('array', 'float',     handlers['array']['float']);
    this.formatter('array', 'decimal',   handlers['array']['string']);
    this.formatter('array', 'date',      handlers['array']['date']);
    this.formatter('array', 'datetime',  handlers['array']['datetime']);
    this.formatter('array', 'boolean',   handlers['array']['boolean']);
    this.formatter('array', 'null',      handlers['array']['null']);
    this.formatter('array', '_default_', handlers['array']['string']);

    this.formatter('cast', 'integer',  handlers['cast']['integer']);
    this.formatter('cast', 'float',    handlers['cast']['float']);
    this.formatter('cast', 'decimal',  handlers['cast']['decimal']);
    this.formatter('cast', 'date',     handlers['cast']['datetime']);
    this.formatter('cast', 'datetime', handlers['cast']['datetime']);
    this.formatter('cast', 'boolean',  handlers['cast']['boolean']);
    this.formatter('cast', 'null',     handlers['cast']['null']);
    this.formatter('cast', 'string',   handlers['cast']['string']);

    if (this._connection) {
      this._formatters = merge({}, this._connection.formatters(), this._formatters);
    }
  }

  /**
   * Gets/sets classes dependencies.
   *
   * @param  Object classes The classes dependencies to set or none to get it.
   * @return mixed          The classes dependencies.
   */
  classes(classes) {
    if (arguments.length) {
      this._classes = extend({}, this._classes, classes);
    }
    return this._classes;
  }

  /**
   * Gets/sets the connection object to which this model is bound.
   *
   * @param  Object connection The connection instance to set or `null` to get the current one.
   * @return mixed             Returns the connection instance on get or `this` on set.
   */
  connection(connection) {
    if (arguments.length) {
      this._connection = connection;
      return this;
    }
    if (!this._connection) {
      throw new Error("Error, missing connection for this schema.");
    }
    return this._connection;
  }

  /**
   * Gets/sets the source name.
   *
   * @param  String source The source name (i.e table/collection name) or `null` to get the defined one.
   * @return mixed         Returns the source on get or `this` on set.
   */
  source(source) {
    if (!arguments.length) {
      return this._source;
    }
    this._source = source;
    return this;
  }

  /**
   * Gets/sets the attached model class.
   *
   * @param  Function model The model class to set to none to get the current model class.
   * @return mixed          The attached model class name on get or `this`.
   */
  model(model) {
    if (!arguments.length) {
      return this._model;
    }
    this._model = model;
    return this;
  }

  /**
   * Gets/sets the schema lock type. When Locked all extra fields which
   * are not part of the schema should be filtered out before saving.
   *
   * @param  Boolean locked The locked value to set to none to get the current lock value.
   * @return mixed          A boolean value or `this`.
   */
  locked(locked) {
    if (!arguments.length) {
      return this._locked;
    }
    this._locked = locked;
    return this;
  }

  /**
   * Gets/Sets the meta data associated to a field if some exists.
   *
   * @param  mixed name The field name. If `undefined` returns all meta. If it's an Object,
   *                    set it as the meta datas.
   * @return mixed      If `name` is a string, it returns the corresponding value
   *                    otherwise it returns a meta data array or `undefined` if not found.
   */
  meta(name, value)
  {
    var num = arguments.length;
    if (!num) {
        return this._meta;
    }
    if (typeof name === 'object' && name !== null) {
        this._meta = name;
        return this;
    }
    if (num === 2) {
        this._meta[name] = value;
        return this;
    }
    return this._meta[name];
  }

  /**
   * Gets/sets the primary key field name of the schema.
   *
   * @param  String key The name or the primary key field name or none to get the defined one.
   * @return String
   */
  key(key) {
    if (!arguments.length) {
        return this._key;
    }
    this._key = key;
    return this;
  }

  /**
   * Gets all fields.
   *
   * @return Array
   */
  fields() {
    var name;
    var fields = [];
    for (var [name, value] of this._columns) {
      var field = {};
      if (value.virtual) {
        continue;
      }
      fields.push(name);
    }
    return fields;
  }

  /**
   * Gets all columns (i.e fields + data).
   *
   * @return Array
   */
  columns() {
    var name;
    var fields = [];
    for (var [name, value] of this._columns) {
      var field = {};
      field[name] = value;
      fields.push(field);
    }
    return fields;
  }

  /**
   * Returns the schema default values.
   *
   * @param  String name An optionnal field name.
   * @return mixed       Returns all default values or a specific one if `name` is set.
   */
  defaults(name) {
    if (arguments.length === 1) {
      return this._columns.has(name) ? this._columns.get(name)['default'] : undefined;
    }
    var defaults = {};
    for (var [name, value] of this._columns) {
      if (value['default'] !== undefined) {
        defaults[name] = value['default'];
      }
    }
    return defaults;
  }

  /**
   * Returns the type value of a field name.
   *
   * @param  String name The field name.
   * @return mixed       The type value or `undefined` if not found.
   */
  type(name) {
    if (!this.has(name)) {
      return;
    }
    var column = this.column(name);
    return column.type;
  }

  /**
   * Gets/sets a column.
   *
   * @param  String name   The field name.
   * @param  Object params The definition.
   * @return mixed         Returns the column definition on get or `this` otherwise.
   */
  column(name, params) {
    if (arguments.length === 1) {
      if (!this.has(name)) {
        throw new Error("Unexisting column `'" + name + "'`.");
      }
      return this._columns.get(name);
    }

    var column = this._initColumn(params);

    if (column.type !== 'object') {
      this._columns.set(name, column);
      return this;
    }
    var relationship = this.classes().relationship;

    if (column.model) {
      column.model = typeof column.model === 'string' ? this.model().registered(column.model) : column.model;
    }

    this.bind(name, {
      type: column.array ? 'set' : 'entity',
      relation: column.array ? 'hasMany' : 'hasOne',
      to: column.model ? column.model : this.model(),
      link: relationship.LINK_EMBEDDED
    });
    this._columns.set(name, column);

    return this;
  }

  /**
   * Normalizes a column.
   *
   * @param  Object column A column Object.
   * @return Object        A normalized column Object.
   */
  _initColumn(column) {
    var defaults = {
      type: 'string',
      array: false
    };
    if (typeof column === 'string') {
      column = { type: column };
    }
    column = extend({}, defaults, column);

    return extend({}, { null: column.type !== 'serial' }, column);
  }

  /**
   * Removes a field/some fields from the schema.
   *
   * @param  string|array name The field name or an array of field names to remove.
   * @return object             Returns `this`.
   */
  remove(name) {
    var names = Array.isArray(name) ? name : [name];
    var i, len = name.length;
    for (var i = 0; i < len; i++) {
      this._columns.delete(names[i]);
    }
    return this;
  }

  /**
   * Checks if the schema has a field/some fields.
   *
   * @param  String|Object name The field name or an array of field names to check.
   * @return Boolean            Returns `true` if present, `false` otherwise.
   */
  has(name) {
    if (!Array.isArray(name)) {
      return this._columns.has(name);
    }
    return intersect(name, this._columns.keys()).length === name.length;
  }

  /**
   * Appends additional fields to the schema. Will overwrite existing fields if a
   * conflicts arise.
   *
   * @param  Array  fields The fields array or a schema instance to merge.
   * @param  Object meta   New meta data.
   * @return Object        Returns `this`.
   */
  append(fields) {
    if (fields.constructor === Object) {
      for (var key in fields) {
        this._columns.set(key, this._initColumn(fields[key]));
      }
    } else {
      var columns = fields instanceof Schema ? fields.columns() : fields;
      for (var value of columns) {
        var key = Object.keys(value)[0];
        this._columns.set(key, value[key]);
      }
    }
    return this;
  }

  /**
   * Gets all virtual fields.
   *
   * @return Object
   */
  virtuals()
  {
    var fields = [];
    for (var [name, field] of this._columns) {
      if (!field.virtual) {
        continue;
      }
      fields.push(name);
    }
    return fields;
  }
  /**
   * Checks if the schema has a field/some virtual fields.
   *
   * @param  String|Array name The field name or an array of field names to check.
   * @return Boolean           Returns `true` if present, `false` otherwise.
   */
  isVirtual(name)
  {
      if (!Array.isArray(name)) {
        var field = this._columns.get(name);
        return field !== undefined && field.virtual;
      }
      for (var field of name) {
        if (!this.isVirtual(field)) {
          return false;
        }
      }
      return true;
  }

  /**
   * Sets a BelongsTo relation.
   *
   * @param  String    name   The name of the relation (i.e. field name where it will be binded).
   * @param  mixed     to     the model to bind.
   * @param  Array     config The configuration that should be specified in the relationship.
   *                          See the `Relationship` class for more information.
   * @return Boolean
   */
  belongsTo(name, to, config) {
    config = extend({}, {
      to: to,
      relation: 'belongsTo'
    }, config);
    return this.bind(name, config);
  }

  /**
   * Sets a hasMany relation.
   *
   * @param  String    name   The name of the relation (i.e. field name where it will be binded).
   * @param  mixed     to     the model to bind.
   * @param  Array     config The configuration that should be specified in the relationship.
   *                          See the `Relationship` class for more information.
   * @return Boolean
   */
  hasMany(name, to, config) {
    config = extend({}, {
      to: to,
      relation: 'hasMany'
    }, config);
    return this.bind(name, config);
  }

  /**
   * Sets a hasOne relation.
   *
   * @param  String    name   The name of the relation (i.e. field name where it will be binded).
   * @param  mixed     to     the model to bind.
   * @param  Array     config The configuration that should be specified in the relationship.
   *                          See the `Relationship` class for more information.
   * @return Boolean
   */
  hasOne(name, to, config) {
    config = extend({}, {
      to: to,
      relation: 'hasOne'
    }, config);
    return this.bind(name, config);
  }

  /**
   * Sets a hasManyThrough relation.
   *
   * @param  String    name    The name of the relation (i.e. field name where it will be binded).
   * @param  String    through the relation name to pivot table.
   * @param  String    using   the target relation name in the through relation.
   * @param  Array     config  The configuration that should be specified in the relationship.
   *                           See the `Relationship` class for more information.
   * @return Boolean
   */
  hasManyThrough(name, through, using, config) {
    config = extend({}, {
      through: through,
      using: using,
      relation: 'hasManyThrough'
    }, config);
    return this.bind(name, config);
  }

  /**
   * Lazy bind a relation.
   *
   * @param  String    name   The name of the relation (i.e. field name where it will be binded).
   * @param  Array     config The configuration that should be specified in the relationship.
   *                          See the `Relationship` class for more information.
   * @return Boolean
   */
  bind(name, config) {
    var relationship = this.classes().relationship;

    config = extend({}, {
      type: 'entity',
      from: this.model(),
      to: undefined,
      link: relationship.LINK_KEY
    }, config);

    config.embedded = config.link.substring(0, 3) !== 'key';

    if (!config.relation || !this.classes()[config.relation]) {
      throw new Error("Unexisting binding relation `" + config.relation + "` for `'{$name}'`.");
    }
    if (!config.from) {
      throw new Error("Binding requires `'from'` option to be set.");
    }
    if (!config.to) {
      if (config.relation !== 'hasManyThrough') {
        throw new Error("Binding requires `'to'` option to be set.");
      }
    } else {
      config.to = typeof config.to === 'string' ? this.model().registered(config.to) : config.to;
    }

    config.array = config.relation.match(/Many/);
    config.type = config.array ? 'set' : config.type;

    if (config.relation === 'hasManyThrough') {
      if (!config.through) {
        throw new Error("Missing `'through'` relation name.");
      }
      if (!this._relations[config.through]) {
        throw new Error("Unexisting `'through'` relation, needed to be created first.");
      }
      this._relations[config.through].junction = true;
      config.using = this._conventions.apply('single', name);
      config.type = 'through';
      this._relations[config.through].junction = true;
    }

    this._relations[name] = config;
    if (this._relations[name].junction !== undefined) {
      this._relations[name].junction = this._relations[name].junction;
    }

    this._relationships[name] = undefined;
    return true;
  }

  /**
   * Unbinds a relation.
   *
   * @param String name The name of the relation to unbind.
   */
  unbind(name) {
    if (!this._relations[name]) {
      return;
    }
    delete this._relations[name];
    delete this._relationships[name];
  }

  /**
   * Returns a relationship instance.
   *
   * @param  String name The name of a relation.
   * @return Object      Returns a relationship intance or `undefined` if it doesn't exists.
   */
  relation(name) {
    if (this._relationships[name]) {
      return this._relationships[name];
    }
    if (!this._relations[name]) {
      throw new Error("Relationship `" + name + "` not found.");
    }
    var config = extend({}, {
      name: name,
      conventions: this._conventions
    }, this._relations[name]);

    var relationship = config.relation;
    var relation = this.classes()[config['relation']];

    delete config.relation;
    return this._relationships[name] = new relation(config);
  }

  /**
   * Returns an array of external relation names.
   *
   * @param  Boolean embedded Include or not embedded relations.
   * @return Array            Returns an array of relation names.
   */
  relations(embedded) {
    var result = [];
    embedded = embedded === undefined ? false : !!embedded;
    for (var field in this._relations) {
      if (!this._relations[field].embedded || embedded) {
        result.push(field);
      }
    }
    return result;
  }

  /**
   * Checks if a relation exists.
   *
   * @param  String  name The name of a relation.
   * @return Boolean      Returns `true` if the relation exists, `false` otherwise.
   */
  hasRelation(name) {
    return !!this._relations[name];
  }

  /**
   * Eager loads relations.
   *
   * @param Object collection The collection to extend.
   * @param Object relations  The relations to eager load.
   * @param Object options    The fetching options.
   */
  embed(collection, relations, options) {
    return co(function*() {
      var habtm = [], tree = {}, rel, subrelations, path, to, key, query, matches;
      options = options || {};

      relations = this.expand(relations);
      tree = this.treeify(relations);

      for (var name in tree) {

        rel = this.relation(name);
        if (rel.type() === 'hasManyThrough') {
          habtm.push(name);
          continue;
        }

        to = rel.to();
        query = !relations[name] ? {} : relations[name];
        if (typeof query === 'function') {
          options.query = { handler: query };
        } else {
          options.query = query;
        }

        var related = yield rel.embed(collection, options);
        subrelations = {};
        for (path in relations) {
          matches = path.match(new RegExp('^' + name + '\.(.*)$'));
          if (matches) {
            subrelations[matches[1]] = relations[path];
          }
        }
        if (Object.keys(subrelations).length) {
          yield to.definition().embed(related, subrelations, options);
        }
      }

      var i, len;
      len = habtm.length;
      for (i = 0; i < len; i++) {
        rel = this.relation(habtm[i]);
        yield rel.embed(collection, options);
      }

      return collection;

    }.bind(this));
  }

  /**
   * Helper which expands all `'hasManyThrough'` relations into their full path.
   *
   * @param  Object relations       The relations to eager load.
   * @return Object                 The relations with expanded `'hasManyThrough'` relations.
   */
  expand(relations) {
    var num, name, rel, relPath;
    relations = normalize(relations);
    for (var path in relations) {
      num = path.lastIndexOf('.');
      name = num !== -1 ? path.substr(0, num) : path;
      var rel = this.relation(name);
      if (rel.type() !== 'hasManyThrough') {
        continue;
      }
      var relPath = rel.through() + '.' + rel.using() + (num !== -1 ? '.' + path.substr(num + 1) : '');
      if (!relations[relPath]) {
        relations[relPath] = relations[path];
      }
    }
    return relations;
  }

  /**
   * The `'embed'` option normalizer function.
   *
   * @return array The normalized with array.
   */
  treeify(embed)
  {
    if (!embed) {
      return {};
    }

    var i, len, keys, relations = {}

    keys = Object.keys(normalize(embed));
    len = keys.length;

    for (i = 0; i < len; i++) {
      relations[keys[i]] = null;
    }
    embed = expand(relations);

    var result = {}, relName, rel, value;
    for (relName in embed) {
      if (!this._relations[relName]) {
        continue;
      }

      value = embed[relName];
      if (this._relations[relName].relation === 'hasManyThrough') {
        rel = this.relation(relName);
        result[rel.through()] = {};
        result[rel.through()][rel.using()] = value;
        result[relName] = value;
      } else {
        result[relName] = value;
      }
    }
    return result;
  }

  /**
   * Casts data according to the schema definition.
   *
   * @param  String name    The field name.
   * @param  Object data    Some data to cast.
   * @param  Object options Options for the casting.
   * @return Object         The casted data.
   */
  cast(field, data, options) {
    var defaults = {
      collector: undefined,
      parent: undefined,
      basePath: undefined,
      exists: false
    };

    options = extend({}, defaults, options);
    options.model = this.model();
    options.schema = this;

    var name;

    if (field) {
      name = options.basePath ? options.basePath + '.' + field : field;
    } else {
      name = options.basePath;
    }

    if (!name) {
      return this._cast(data, options);
    }

    if (this._relations[name]) {
      options = extend({}, this._relations[name], options);
      options.basePath = options.embedded ? name : undefined;

      if (options.relation !== 'hasManyThrough') {
        options.model = options.to;
      } else {
        var through = this.relation(name);
        options.model = through.to();
      }
      if (options.array && field) {
        return this._castArray(name, data, options);
      }
      return this._cast(data, options);
    }
    if (this._columns.has(name)) {
      options = extend({}, this._columns.get(name), options);
      if (typeof options.setter === 'function') {
        data = options.setter(options.parent, data, name);
      }
      if (options.array && field) {
        return this._castArray(name, data, options);
      }
      return this.format('cast', name, data);
    }
    if (this.locked()) {
      throw new Error("Missing schema definition for field: `" + name + "`.");
    }
    if (Array.isArray(data)) {
      return this._castArray(name, data, options);
    }
    if (data !== null && typeof data === 'object' && data.constructor === Object) {
      options.basePath = name;
      return this._cast(data, options);
    }
    return data;
  }

  /**
   * Casting helper for entities.
   *
   * @param  Object data       Some data to cast.
   * @param  Object options    Options for the casting.
   * @return mixed             The casted data.
   */
  _cast(data, options) {
    if (data instanceof Document) {
      data.basePath(options.basePath);
      return data;
    }
    options.data = data ? data : {};
    options.schema = options.model === Document ? options.schema : undefined;
    return new options.model(options);
  }

  /**
   * Casting helper for arrays.
   *
   * @param  String name       The field name to cast.
   * @param  Object data       Some data to cast.
   * @param  Object options    Options for the casting.
   * @return mixed             The casted data.
   */
  _castArray(name, data, options) {
    options.type = options.relation === 'hasManyThrough' ? 'through' : 'set';
    var Collection = this.classes()[options.type];
    if (data instanceof Collection) {
      data.basePath(options.basePath);
      return data;
    }
    options.data = data ? data : [];
    options.schema = options.model.definition();
    return new Collection(options);
  }

  /**
   * Return default casting handlers.
   *
   * @return Object
   */
  _handlers() {
    return {
      array: {
        'string': function(value, options) {
          return String(value);
        },
        'integer': function(value, options) {
          return Number.parseInt(value);
        },
        'float': function(value, options) {
          return Number.parseFloat(value);
        },
        'date': function(value, options) {
          options = options || {};
          options.format = options.format ? options.format : 'yyyy-mm-dd';
          return this.convert('array', 'datetime', value, options);
        }.bind(this),
        'datetime': function(value, options) {
          options = options || {};
          options.format = options.format ? options.format : 'yyyy-mm-dd HH:MM:ss';
          if (!value instanceof Date) {
            value = new Date(value);
          }
          return dateFormat(value, options.format);
        },
        'boolean': function(value, options) {
          return !!value;
        },
        'null': function(value, options) {
          return null;
        }
      },
      cast: {
        'string': function(value, options) {
          return String(value);
        },
        'integer': function(value, options) {
          return Number.parseInt(value);
        },
        'float': function(value, options) {
          return Number.parseFloat(value);
        },
        'decimal': function(value, options) {
          var defaults = { precision: 2 };
          options = extend({}, defaults, options);
          return Number(value).toFixed(options.precision);
        },
        'date':function(value, options) {
          return new Date(value);
        },
        'datetime': function(value, options) {
          return new Date(value);
        },
        'boolean': function(value, options) {
          return !!value;
        },
        'null': function(value, options) {
          return null;
        }
      }
    };
  }

  /**
   * Formats a value according to a field definition.
   *
   * @param   String mode  The format mode (i.e. `'cast'` or `'datasource'`).
   * @param   String name  The field name.
   * @param   mixed  value The value to format.
   * @return  mixed        The formated value.
   */
  format(mode, name, value) {
    var type = value === null ? 'null' : this.type(name);
    return this.convert(mode, type, value, this._columns.get(name));
  }

  /**
   * Formats a value according to its type.
   *
   * @param   String mode    The format mode (i.e. `'cast'` or `'datasource'`).
   * @param   String type    The format type.
   * @param   mixed  value   The value to format.
   * @param   mixed  options The options array to pass the the formatter handler.
   * @return  mixed          The formated value.
   */
  convert(mode, type, value, options) {
    var formatter;
    if (this._formatters[mode] && this._formatters[mode][type]) {
      formatter = this._formatters[mode][type];
    } else if (this._formatters[mode] && this._formatters[mode]._default_) {
      formatter = this._formatters[mode]._default_;
    }
    return formatter ? formatter(value, options) : value;
  }

  /**
   * Gets/sets a formatter handler.
   *
   * @param  String   mode          The formatting mode.
   * @param  String   type          The field type name.
   * @param  Function handler       The formatter handler to set or none to get it.
   * @return object                 Returns `this` on set and the formatter handler on get.
   */
  formatter(mode, type, handler) {
    if (arguments.length === 2) {
      return (this._formatters[mode] && this._formatters[mode][type]) ? this._formatters[mode][type] : this._formatters[mode]._default_;
    }
    if (this._formatters[mode] === undefined) {
      this._formatters[mode] = {};
    }
    this._formatters[mode][type] = handler;
    return this;
  }

  /**
   * Gets/sets all formatters.
   *
   * @param  Object formatters The formatters to set or none to get them.
   * @return mixed             Returns `this` on set and the formatters array on get.
   */
  formatters(formatters) {
    if (!arguments.length) {
      return this._formatters;
    }
    this._formatters = formatters;
    return this;
  }

  /**
   * Gets/sets the conventions object to which this schema is bound.
   *
   * @param  object conventions The conventions instance to set or none to get it.
   * @return object             Returns `this` on set and the conventions instance on get.
   */
  conventions(conventions) {
    if (arguments.length) {
      this._conventions = conventions;
      return this;
    }
    return this._conventions;
  }

  /**
   * Returns a query to retrieve data from the connected data source.
   *
   * @param  Object options Query options.
   * @return Object         An instance of `Query`.
   */
  query(options) {
    throw new Error("Missing `query()` implementation for `" + this.model.name + "`'s schema.");
  }

  /**
   * Inserts and/or updates an entity and its direct relationship data in the datasource.
   *
   * @param  Object   entity  The entity instance to save.
   * @param  Object   options Options.
   * @return Promise         Returns a promise.
   */
  save(entity, options) {
    throw new Error("Missing `query()` implementation for `" + this.model.name + "`'s schema.");
  }

  /**
   * Inserts a records  with the given data.
   *
   * @param  Object  data        Typically an array of key/value pairs that specify the new data with which
   *                             the records will be updated. For SQL databases, this can optionally be
   *                             an SQL fragment representing the `SET` clause of an `UPDATE` query.
   * @param  Object  options     Any database-specific options to use when performing the operation.
   * @return boolean             Returns `true` if the update operation succeeded, otherwise `false`.
   */
  insert(data, options) {
    throw new Error("Missing `insert()` implementation for `" + this.model.name + "`'s schema.");
  }

  /**
   * Updates multiple records with the given data, restricted by the given set of criteria (optional).
   *
   * @param  Object  data       Typically an array of key/value pairs that specify the new data with which
   *                            the records will be updated. For SQL databases, this can optionally be
   *                            an SQL fragment representing the `SET` clause of an `UPDATE` query.
   * @param  Object  conditions An array of key/value pairs representing the scope of the records
   *                            to be updated.
   * @param  Object  options    Any database-specific options to use when performing the operation.
   * @return boolean            Returns `true` if the update operation succeeded, otherwise `false`.
   */
  update(data, conditions, options) {
    throw new Error("Missing `update()` implementation for `" + this.model.name + "`'s schema.");
  }

  /**
   * Removes multiple documents or records based on a given set of criteria. **WARNING**: If no
   * criteria are specified, or if the criteria (`conditions`) is an empty value (i.e. an empty
   * array, `undefined` or `null`), all the data in the backend data source (i.e. table or collection) _will_
   * be deleted.
   *
   * @param Object    conditions An array of key/value pairs representing the scope of the records or
   *                             documents to be deleted.
   * @param Object    options    Any database-specific options to use when performing the operation. See
   *                             the `delete()` method of the corresponding backend database for available
   *                             options.
   * @return boolean             Returns `true` if the remove operation succeeded, otherwise `false`.
   */
  truncate(conditions, options) {
    throw new Error("Missing `truncate()` implementation for `" + this.model.name + "`'s schema.");
  }

  /**
   * Returns the last insert id from the database.
   *
   * @return mixed Returns the last insert id.
   */
  lastInsertId() {
    throw new Error("Missing `lastInsertId()` implementation for `" + this.model.name + "`'s schema.");
  }

}

/**
 * Class dependencies.
 *
 * @var array
 */
Schema._classes = {
  set: Collection,
  through: Through,
  relationship: Relationship,
  belongsTo: BelongsTo,
  hasOne: HasOne,
  hasMany: HasMany,
  hasManyThrough: HasManyThrough
};

export default Schema;
