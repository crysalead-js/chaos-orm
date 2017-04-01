var extend = require('extend-merge').extend;
var merge = require('extend-merge').merge;
var camelize = require('camel-case');
var pascalize = require('pascal-case');
var underscore = require('snake-case');
var inflector = require('pluralize');

class Conventions {

  constructor(config) {
    /**
     * An array of naming convention rules
     *
     * @var Object
     */
    this._conventions = {};

    this.config(config);
  }

  /**
   * Configures the schema class.
   *
   * @param Object config Possible options are:
   *                      - `'conventions'` _array_: Allow to override the default convention rules for generating
   *                                                 primary or foreign key as well as for table/collection names
   *                                                 from an entity class name.
   */
  config(config) {
    var defaults = {
      conventions: {
        source: function(name) {
          return underscore(name);
        },
        key: function() {
            return 'id';
        },
        reference: function(name) {
            return underscore(inflector.singular(name)) + '_id';
        },
        references: function(name) {
            return underscore(inflector.singular(name)) + '_ids';
        },
        field: function(name) {
            return underscore(inflector.singular(name));
        },
        multiple: function(name) {
            return inflector.plural(name);
        },
        single: function(name) {
            return inflector.singular(name);
        }
      }
    };
    config = extend({}, defaults, config);
    this._conventions = config.conventions;
  }

  /**
   * Adds a specific convention rule.
   *
   * @param  string   name    The name of the convention or nothing to get all.
   * @param  Function closure The convention closure.
   * @return Function         The passed convention closure.
   */
  set(name, closure) {
    return this._conventions[name] = closure;
  }

  /**
   * Gets a specific or all convention rules.
   *
   * @param  string    $name The name of the convention or nothing to get all.
   * @return mixed           The closure or an array of closures.
   * @throws Exception       Throws an `Exception` if no rule has been found.
   */
  get(name) {
    if (!arguments.length) {
      return extend({}, this._conventions);
    }
    if (!this._conventions[name]) {
      throw new Error("Convention for `'" + name + "'` doesn't exists.");
    }
    return this._conventions[name];
  }

  /**
   * Applies a specific convention rules.
   *
   * @param  string    $name  The name of the convention.
   * @param  mixed     $param Parameter to pass to the closure.
   * @param  mixed     ...    Parameter to pass to the closure.
   * @return mixed
   * @throws Exception       Throws a `ChaosException` if no rule has been found.
   */
  apply(name) {
      var params = Array.prototype.slice.call(arguments);
      params.shift();
      var convention = this.get(name);
      return convention.apply(convention, params);
  }
}

module.exports = Conventions;
