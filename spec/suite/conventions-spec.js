import { Conventions } from '../../src';

describe("Conventions", function() {

  describe(".constructor()", function() {

    it("sets up default primary key", function() {

      var conventions = new Conventions();
      expect(conventions.apply('key')).toBe('id');

    });

    it("sets up default conventions", function() {

      var conventions = new Conventions();

      expect(conventions.apply('source', 'MyPost')).toBe('my_post');
      expect(conventions.apply('reference', 'MyPost')).toBe('my_post_id');
      expect(conventions.apply('field', 'MyPost')).toBe('my_post');
      expect(conventions.apply('single', 'tag')).toBe('tag');
      expect(conventions.apply('multiple', 'tag')).toBe('tags');
      expect(conventions.apply('getter', 'hello_world')).toBe('getHelloWorld');
      expect(conventions.apply('setter', 'hello_world')).toBe('setHelloWorld');

    });

    it("sets up default conventions for plural model names", function() {

      var conventions = new Conventions();
      expect(conventions.apply('source', 'MyComments')).toBe('my_comments');
      expect(conventions.apply('reference', 'MyComments')).toBe('my_comment_id');
      expect(conventions.apply('field', 'MyComments')).toBe('my_comment');
      expect(conventions.apply('single', 'tags')).toBe('tag');
      expect(conventions.apply('multiple', 'tags')).toBe('tags');

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
        'field',
        'getter',
        'key',
        'multiple',
        'reference',
        'setter',
        'single',
        'source'
      ]);

    });

    it("gets a specific convention", function() {

      var conventions = new Conventions();
      var closure = conventions.get('field');
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