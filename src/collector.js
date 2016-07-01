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
   * @param String uuid  The UUID to look up.
   * @param mixed        The data to collect.
   */
  set(uuid, data) {
    this._data[uuid] = data;
    return this;
  }

  /**
   * Gets a collected object.
   *
   * @param  string uuid   The UUID to look up.
   * @return mixed         The collected data.
   */
  get(uuid) {
    if (this.has(uuid)) {
      return this._data[uuid];
    }
    throw new Error("No collected data with UUID `'" + uuid + "'` in this collector.");
  }

  /**
   * Uncollects an object.
   *
   * @param String uuid  The UUID to remove.
   */
  remove(uuid) {
    delete this._data[uuid];
    return this;
  }

  /**
   * Checks if an object with a specific ID has already been collected.
   *
   * @param  String  uuid  The UUID to look up.
   * @return Boolean       Returns `true` if exists, `false` otherwise.
   */
  has(uuid) {
    return this._data[uuid] !== undefined;
  }
}

export default Collector;