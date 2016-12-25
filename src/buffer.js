var co = require('co');

/**
 * The Query wrapper.
 */
class Buffer {

  /**
   * Creates a new record object with default values.
   *
   * @param mixed collection The data.
   */
  constructor(collection) {
    /**
     * The data.
     *
     * @var mixed
     */
    this._collection = collection || [];
  }

  /**
   * Executes the query and returns the result.
   *
   * @param  array  options The fetching options.
   * @return object          An iterator instance.
   */
  get(options) {
    return co(function*() {
      return this._collection;
    }.bind(this));
  }

  /**
   * Alias for `get()`
   *
   * @return object An iterator instance.
   */
  all(options) {
    return this.get(options);
  }

  /**
   * Executes the query and returns the first result only.
   *
   * @return object An entity instance.
   */
  first(options) {
    return co(function*() {
      var result = yield this.get(options);
      return Array.isArray(result) ? result[0] : result.get(0);
    }.bind(this));
  }

  /**
   * Executes the query and returns the count number.
   *
   * @return integer The number of rows in result.
   */
  count() {
    return co(function*() {
      return this._collection.length;
    }.bind(this));
  }
}

module.exports = Buffer;
