import { extend, merge } from 'extend-merge';

class Source {
  /**
   * Creates a source instance to deal with casting.
   *
   * @param  config array Array of configuration options.
   * @return Database object.
   */
  constructor(config) {
    config = config || {};

    /**
     * Import/export casting definitions.
     *
     * @var Object
     */
    this._formatters = {};

    /**
     * Type conversion definitions.
     *
     * @var Object
     */
    this._handlers = merge({}, this._handlers(), config.handlers);

    var handlers = this._handlers;

    this.formatter('cast', 'id',        handlers.cast['integer']);
    this.formatter('cast', 'serial',    handlers.cast['integer']);
    this.formatter('cast', 'integer',   handlers.cast['integer']);
    this.formatter('cast', 'float',     handlers.cast['float']);
    this.formatter('cast', 'decimal',   handlers.cast['decimal']);
    this.formatter('cast', 'date',      handlers.cast['date']);
    this.formatter('cast', 'datetime',  handlers.cast['datetime']);
    this.formatter('cast', 'boolean',   handlers.cast['boolean']);
    this.formatter('cast', 'null',      handlers.cast['null']);
    this.formatter('cast', 'string',    handlers.cast['string']);

    this.formatter('datasource', '_default_', handlers.datasource['string']);
  }

  /**
   * Return default cast handlers
   *
   * @return array
   */
  _handlers() {
    return {
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
          return Number.parseFloat(value);
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
      },
      datasource: {
        'string': function(value, options) {
          return value instanceof Date ? value.toISOString().substring(0, 19).replace('T', ' ') : String(value);
        }
      }
    };
  }

  /**
   * Gets/sets a formatter handler.
   *
   * @param  String   mode          The formatting mode (i.e. `'cast'` or `'datasource'`).
   * @param  String   type          The type name.
   * @param  Function handler       The casting handler.
   * @retrun mixed                  A casting handler or `this` on set.
   */
  formatter(mode, type, handler) {
    if (arguments.length === 2) {
      return this._formatters[mode] && this._formatters[mode][type] !== undefined ? this._formatters[mode][type] : this._formatters[mode]['_default_'];
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
   * @param  mixed formatters The formatters to set of nothing to get them all.
   * @return mixed            The formatters of `this` on set.
   */
  formatters(formatters) {
    if (!arguments.length) {
      return this._formatters;
    }
    this._formatters = formatters;
    return this;
  }

  /**
   * Formats a value according to its definition.
   *
   * @param   String mode    The formatting mode (i.e. `'cast'` or `'datasource'`).
   * @param   String type    The type name.
   * @param   mixed  value   The value to format.
   * @param   Object options The options the pass to the casting handler.
   * @return  mixed          The formated value.
   */
  format(mode, type, value, options) {
    var formatter = null;
    if (this._formatters[mode]) {
      if (this._formatters[mode][type] !== undefined) {
        formatter = this._formatters[mode][type];
      } else if (this._formatters[mode]['_default_'] !== undefined) {
        formatter = this._formatters[mode]['_default_'];
      }
    }
    return formatter ? formatter(value, options) : value;
  }

  /**
   * Extracts the type of a value.
   *
   * @param  mixed  The value.
   * @return String The value type.
   */
  static getType(value) {
    if (typeof value === 'object') {
      if (value === null) {
        return 'null';
      }
      if (Array.isArray(value)) {
        return 'array';
      }
      return 'object';
    }
    if (typeof value === 'string') {
      return 'string';
    }
    if (typeof value === 'boolean') {
      return 'boolean';
    }
    if (typeof value === 'number') {
      return value % 1 === 0 ? 'integer' : 'double';
    }
  }
}

export default Source;
