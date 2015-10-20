import Conventions from '../../src/conventions';

describe("Conventions", function() {

  describe(".constructor()", function() {

    it("sets up default primary key", function() {

      var conventions = new Conventions();
      expect(conventions.apply('primaryKey')).toBe('id');

    });

    it("sets up default conventions", function() {

      var conventions = new Conventions();

      expect(conventions.apply('source', 'MyPost')).toBe('my_post');
      expect(conventions.apply('foreignKey', 'MyPost')).toBe('my_post_id');
      expect(conventions.apply('fieldName', 'MyPost')).toBe('my_post');
      expect(conventions.apply('usingName', 'tag')).toBe('tag');
      expect(conventions.apply('getter', 'hello_world')).toBe('getHelloWorld');
      expect(conventions.apply('setter', 'hello_world')).toBe('setHelloWorld');

    });

    it("sets up default conventions for plural model names", function() {

      var conventions = new Conventions();
      expect(conventions.apply('source', 'MyComments')).toBe('my_comments');
      expect(conventions.apply('foreignKey', 'MyComments')).toBe('my_comment_id');
      expect(conventions.apply('fieldName', 'MyComments')).toBe('my_comment');
      expect(conventions.apply('usingName', 'tags')).toBe('tag');

    });

  });

  describe(".add()/.apply()", function() {

    it("adds a convention", function() {

      var conventions = new Conventions();
      conventions.set('helloWorld', function(name) {
        return name === 'hello' ? 'world' : null;
      });
      expect(conventions.apply('helloWorld', 'hello')).toBe('world');

    });

  });

  describe(".get()", function() {

    it("gets all conventions", function() {

      var conventions = new Conventions();
      var closures = conventions.get();
      var keys = Object.keys(closures).sort();
      expect(keys).toEqual([
        'fieldName',
        'foreignKey',
        'getter',
        'primaryKey',
        'setter',
        'source',
        'usingName'
      ]);

    });

    it("gets a specific convention", function() {

      var conventions = new Conventions();
      var closure = conventions.get('fieldName');
      expect(typeof closure).toBe('function');

    });

    it("throws an error for undefined convention", function() {

      var closure = function() {
        var conventions = new Conventions();
        conventions.get('unexisting');
      };

      expect(closure).toThrow(new Error("Convention for `'unexisting'` doesn't exists."));

    });

  });

});