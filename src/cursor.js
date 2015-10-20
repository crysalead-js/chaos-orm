import {extend, merge} from 'extend-merge';

class Cursor {
  /**
   * `Cursor` constructor.
   *
   * @param Object config Possible values are:
   *                      - `'data'`     _array_   : A data array.
   *                      - `'resource'` _resource_: The resource to fetch on.
   *                      - `'error'`    _boolean_ : A error boolean flag.
   *                      - `'errno'`    _mixed_   : An error code number.
   *                      - `'errmsg'`   _string_  : A full string error message.
   */
  constructor(config) {
    var defaults = {
      data: [],
      resource: undefined,
      error: false,
      errno: 0,
      errmsg: ''
    };

    config = extend({}, defaults, config);

    /**
     * The bound resource.
     *
     * @var resource
     */

    this._resource = config.resource;

    /**
     * The optionnal bound data.
     *
     * @var array
     */
    this._data = config.data;

    /**
     * Indicates whether the cursor is valid or not.
     *
     * @var Boolean
     */
    this._error = config.error;

    /**
     * Stores the error number.
     *
     * @var integer
     */
    this._errno = config.errno;

    /**
     * Stores the error message.
     *
     * @var String
     */
    this._errmsg = config.errmsg;

    /**
     * Indicates whether the fetching has been started.
     *
     * @var Boolean
     */
    this._started = false;

    /**
     * Indicates whether the resource has been initialized.
     *
     * @var Boolean
     */
    this._init = false;

    /**
     * Indicates whether the current position is valid or not.
     *
     * @var Boolean
     */
    this._valid = true;

    /**
     * Contains the current key of the cursor.
     *
     * @var integer
     */
    this._key = undefined;

    /**
     * Contains the current index of the cursor.
     *
     * @var integer
     */
    this._index = 0;

    /**
     * Contains the current value of the cursor.
     *
     * @var mixed
     */
    this._current = false;
  }

  /**
   * Returns the bound data.
   *
   * @return Array
   */
  data() {
    return this._data;
  }

  /**
   * Returns the bound resource.
   *
   * @return ressource
   */
  resource() {
    return this._resource;
  }

  /**
   * Returns the error value.
   *
   * @return Boolean
   */
  error() {
    return this._error;
  }

  /**
   * Returns the error number.
   *
   * @return mixed
   */
  errno() {
    return this._errno;
  }

  /**
   * Returns the error message.
   *
   * @return String
   */
  errmsg() {
    return this._errmsg;
  }

  /**
   * Checks if current position is valid.
   *
   * @return Boolean `true` if valid, `false` otherwise.
   */
  valid() {
    if (!this._init) {
      this._fetch();
    }
    return this._valid;
  }

  /**
   * Rewinds the cursor to its first position.
   */
  rewind() {
    this._started = false;
    this._key = undefined;
    this._index = 0;
    this._current = false;
    this._init = false;
  }

  /**
   * Returns the current value.
   *
   * @return mixed The current value (or `undefined` if there is none).
   */
  current() {
    if (!this._init) {
      this._fetch();
    }
    this._started = true;
    return this._current;
  }

  /**
   * Returns the current key value.
   *
   * @return integer The current key value.
   */
  key() {
    if (!this._init) {
      this._fetch();
    }
    this._started = true;
    return this._key;
  }

  /**
   * Fetches the next element from the resource.
   *
   * @return mixed The next result (or `false` if there is none).
   */
  next() {
    if (this._started === false) {
      return this.current();
    }
    this._fetch();
    return this.current();
  }

  /**
   * Fetches the current element from the resource.
   *
   * @return Boolean Return `true` on success or `false` otherwise.
   */
  _fetch() {
    this._init = true;
    if(this._resource) {
      return this._fetchResource();
    } else {
      return this._fetchArray();
    }
    return false;
  }

  /**
   * Fetches the result from the data array.
   *
   * @return Boolean Return `true` on success or `false` otherwise.
   */
  _fetchArray() {
    if (this._index >= this._data.length) {
      this._key = undefined;
      this._current = undefined;
      this._valid = false;
      return false;
    }

    this._key = this._index;
    this._current = this._data[this._key];

    this._index++;
    if (this._index >= this._data.length) {
      this._valid = false;
    }
    return true;
  }

  /**
   * Closes the resource.
   */
  close() {
    delete this._resource;
    this._resource = undefined;
    this._data = [];
    this._index = 0;
  }

  /**
   * The fetching method for resource based cursor.
   */
  _fetchResource() {
    throw new Error("This cursor doesn't support ressource");
  }

}

Cursor.prototype[Symbol.iterator] = function() {
  return {
    next: function() {
      return this.valid() ? { value: this.next(), done: false } : { done: true };
    }.bind(this)
  };
};

export default Cursor;
