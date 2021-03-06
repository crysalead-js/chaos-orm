var co = require('co');
var extend = require('extend-merge').extend;
var merge = require('extend-merge').merge;
var Conventions = require('../conventions');
var Relationship = require('../relationship');
var Through = require('../collection/through');
var Document = require('../document');

/**
 * The `HasManyThrough` relationship.
 */
class HasManyThrough extends Relationship {
  /**
   * Constructs an object that represents a relationship between two model classes.
   *
   * @see Relationship
   * @param array $config The relationship's configuration, which defines how the two models in
   *                      question are bound. The available options are:
   *                      - `'name'`        _string_ : The field name used for accessing the related data.
   *                                                   For example, in the case of `Post` hasMany `Comment`, the name defaults to `'comments'`.
   *                      - `'from'`        _string_ : The fully namespaced class name this relationship originates.
   *                      - `'through'`     _string_ : The relation name of the pivot.
   *                      - `'using'`       _string_ : The relation name to use in combinaison with through option.
   *                      - `'link'`        _string_ : A constant specifying how the object bound to the originating
   *                                                   model is linked to the object bound to the target model. For relational
   *                                                   databases, the only valid value is `LINK_KEY`, which means a foreign
   *                                                   key in one object matches another key (usually the primary key) in the other.
   *                                                   For document-oriented and other non-relational databases, different types of
   *                                                   linking, including key lists or even embedding.
   *                      - `'fields'`      _mixed_  : An array of the subset of fields that should be selected
   *                                                   from the related object(s) by default. If set to `true` (the default), all
   *                                                   fields are selected.
   *                      - `'conventions'` _object_ : The naming conventions instance to use.
   */
  constructor(config) {
    super({ to: function(){}, from: function(){} });

    var defaults = {
      name: '',
      from: undefined,
      through: '',
      using: '',
      link: this.constructor.LINK_KEY,
      fields: true,
      conventions: undefined
    };

    config = Object.assign(defaults, config);

    if (!config.from) {
      throw new Error("The relationship `'from'` option can't be empty.");
    }

    if (!config.through) {
      throw new Error("The relationship `'through'` option can't be empty.");
    }

    if (!config.using) {
      throw new Error("The relationship `'using'` option can't be empty.");
    }

    this._conventions = config.conventions ? config.conventions : new Conventions();

    this._from = config.from;
    this._link = config.link;
    this._fields = config.fields;

    /**
     * The relation name of the pivot.
     *
     * @var string
     */
    this._through = config.through;

    /**
     * The relation name to use in combinaison with through option.
     *
     * @var string
     */
    this._using = config.using;

    var from = this.from();
    var relThrough = from.definition().relation(this.through());
    relThrough.junction(true);
    var pivot = relThrough.to();
    var relUsing = pivot.definition().relation(this.using());

    this._to = relUsing.to();
    this._keys = relUsing.keys();

    this._name = config.name ? config.name : this._conventions.apply('field', this.to().name);

    var lower = this.constructor.name.charAt(0).toLowerCase();
    this._type = lower + this.constructor.name.substr(1);
  }

  /**
   * Returns pivot relation name.
   *
   * @return mixed
   */
  through() {
    return this._through;
  }

  /**
   * Returns the target relation name in the pivot relation.
   *
   * @return String
   */
  using() {
    return this._using;
  }

  /**
   * Expands a collection of entities by adding their related data.
   *
   * @param  mixed      collection The collection to expand.
   * @param  Object     options    The embedding options.
   * @return Collection            The collection of related entities.
   */
  embed(collection, options) {
    return co(function*() {
      var name = this.name();
      var through = this.through();
      var using = this.using();

      var from = this.from();
      var relThrough = from.definition().relation(through);

      // Embedding twice is unstable
      // var middle = yield relThrough.embed(collection, options);

      var pivot = relThrough.to();
      var relUsing = pivot.definition().relation(using);

      // Embedding twice is unstable
      // var related = yield relUsing.embed(middle, options);

      var to = relUsing.to();
      var toSchema = to.definition();

      collection.forEach(function(entity) {
        if (entity instanceof Document) {
          entity.set(name, new Through({
            parent: entity,
            schema: toSchema,
            through: through,
            using: using
          }));
        } else {
          entity[name] = [];
        }
      });

      collection.forEach(function(entity, index) {
        if (entity instanceof Document) {
          return;
        }
        entity[through].forEach(function(item, key) {
          collection[index][name].push(item[using]);
        });
      });
    }.bind(this));
  }

  /**
   * Saves a relation.
   *
   * @param  Object  entity  The relation's entity
   * @param  Object  options Saving options.
   * @return Promise
   */
  save(entity, options) {
    return Promise.resolve(true);
  }

  /**
   * Validating an entity relation.
   *
   * @param  Object   entity  The relation's entity
   * @param  Object   options Saving options.
   * @return Promise
   */
  validates(entity, options) {
    return Promise.resolve(true);
  }
}

module.exports = HasManyThrough;