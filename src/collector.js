/**
 * The `Collector` class ensures single references of objects through the Identity Map pattern.
 */
class Collector {

  constructor() {
    /**
     * The map array scoped by names.
     *
     * @var Object
     */
    this._data = {};
  }

  /**
   * Collects an object.
   *
   * @param String scope The scope name.
   * @param String id    The ID to look up.
   * @param mixed        The data to collect.
   */
  set(scope, id, data)
  {
    if (this._data[scope] === undefined) {
      this._data[scope] = {};
    }
    this._data[scope][id] = data;
  }

  /**
   * Checks if an object with a specific ID has already been collected.
   *
   * @param  String  scope The scope name.
   * @param  String  id    The ID to look up.
   * @return Boolean       Returns `true` if exists, `false` otherwise.
   */
  exists(scope, id) {
    return this._data[scope] && this._data[scope][id];
  }

  /**
   * Gets a collected object.
   *
   * @param  string $scope The scope name.
   * @param  string $id    The ID to look up.
   * @return mixed         The collected data.
   */
  get(scope, id) {
    if (this.exists(scope, id)) {
      return this._data[scope][id];
    }
    throw new Error("No collected data for `'" + scope + "'` with ID `'" + id + "'` in this collector.");
  }
}

export default Collector;