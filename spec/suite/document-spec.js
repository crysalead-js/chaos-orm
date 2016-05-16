import co from 'co';
import { Document } from '../../src';

describe("Document", function() {

  describe(".constructor()", function() {

    it("loads the data", function() {

      var date = new Date('2014-10-26 00:25:15');

      var entity = new Document({ data: {
        title: 'Hello',
        body: 'World',
        created: date
      }});

      expect(entity.get('title')).toBe('Hello');
      expect(entity.get('body')).toBe('World');
      expect(entity.get('created')).toBe(date);

    });

  });

  describe(".exists()", function() {

    it("returns the exists value", function() {

      var entity = Document.create({}, { exists: true });
      expect(entity.exists()).toBe(true);

    });

  });

  describe(".parent()", function() {

    it("sets a parent", function() {

      var parent = {};
      var entity = new Document();
      entity.parent(parent);
      expect(entity.parent()).toBe(parent);

    });

    it("returns the parent", function() {

      var parent = {};
      var entity = Document.create({}, { parent: parent });
      expect(entity.parent()).toBe(parent);

    });

  });

  describe(".rootPath()", function() {

    it("returns the root path", function() {

      var entity = Document.create({}, { rootPath: 'items' });
      expect(entity.rootPath()).toBe('items');

    });

  });

  describe(".get()/.set()", function() {

    it("sets values", function() {

      var date = new Date('2014-10-26 00:25:15');

      var entity = new Document();
      expect(entity.set('title', 'Hello')).toBe(entity);
      expect(entity.set('body', 'World')).toBe(entity);
      expect(entity.set('created', date)).toBe(entity);

      expect(entity.get('title')).toBe('Hello');
      expect(entity.get('body')).toBe('World');
      expect(entity.get('created')).toBe(date);

    });

    it("sets nested arbitraty value in cascade", function() {

      var data = Document.create();
      data.set('a.nested.value', 'hello');

      expect(data.data()).toEqual({
        a: {
          nested: {
            value: 'hello'
          }
        }
      });

    });

    it("returns `null` for undefined fields", function() {

      var entity = new Document();
      expect(entity.get('foo')).toBe(undefined);

    });

    it("sets an array of values", function() {

      var date = new Date('2014-10-26 00:25:15');

      var entity = new Document();
      expect(entity.set({
        title: 'Hello',
        body: 'World',
        created: date
      })).toBe(entity);
      expect(entity.get('title')).toBe('Hello');
      expect(entity.get('body')).toBe('World');
      expect(entity.get('created')).toBe(date);

    });

    it("returns all raw datas with no parameter", function() {

      var timestamp = 1446208769;

      var entity = Document.create({
        title: 'Hello',
        body: 'World',
        created: timestamp
      });
      expect(entity.get()).toEqual({
        title: 'Hello',
        body: 'World',
        created: timestamp
      });

    });

    it("throws an exception if the field name is not valid", function() {

       var closure = function() {
        var entity = new Document();
        entity.get('');
      };
      expect(closure).toThrow(new Error("Field name can't be empty."));

    });

  });

  describe(".persisted()", function() {

    it("returns persisted data", function() {

      var entity = Document.create({
        id: 1,
        title: 'Hello',
        body: 'World'
      }, { exists: true });

      entity.set({
        id: 1,
        title: 'Good Bye',
        body: 'Folks'
      });

      expect(entity.persisted('title')).toBe('Hello');
      expect(entity.persisted('body')).toBe('World');

      expect(entity.get('title')).toBe('Good Bye');
      expect(entity.get('body')).toBe('Folks');

      expect(entity.modified('title')).toBe(true);
      expect(entity.modified('body')).toBe(true);

    });

    it("returns all persisted data with no parameter", function() {

      var entity = Document.create({
        id: 1,
        title: 'Hello',
        body: 'World'
      }, { exists: true });

      entity.set({
        id: 1,
        title: 'Good Bye',
        body: 'Folks'
      });

      expect(entity.persisted()).toEqual({
        id: 1,
        title: 'Hello',
        body: 'World'
      });

    });

  });

  describe(".modified()", function() {

    it("returns a boolean indicating if a field has been modified", function() {

      var entity = Document.create({ title: 'original' }, { exists: true });

      expect(entity.modified('title')).toBe(false);

      entity.set('title', 'modified');
      expect(entity.modified('title')).toBe(true);

    });

    it("returns `false` if a field has been updated with a same scalar value", function() {

      var entity = Document.create({ title: 'original' }, { exists: true });

      expect(entity.modified('title')).toBe(false);

      entity.set('title', 'original');
      expect(entity.modified('title')).toBe(false);

    });

    it("returns `false` if a field has been updated with a similar object value", function() {

      var entity = Document.create({ 'body': {} }, { exists: true });

      expect(entity.modified('body')).toBe(false);

      entity.set('body', entity.get('body'));
      expect(entity.modified('body')).toBe(false);

    });

    it("delegates the job for values which has a `modified()` method", function() {

      var childEntity = Document.create({ field: 'value' }, { exists: true });

      var entity = Document.create({ child: childEntity }, { exists: true });

      expect(entity.modified()).toBe(false);

      entity.get('child').set('field', 'modified');
      expect(entity.modified()).toBe(true);

    });

    it("returns `true` when an unexisting field has been added", function() {

      var entity = Document.create({}, { exists: true });

      entity.set('modified', 'modified');

      expect(entity.modified()).toBe(true);

    });

    it("returns `true` when a field is removed", function() {

      var entity = Document.create({ title: 'original' }, { exists: true });

      expect(entity.modified('title')).toBe(false);

      entity.unset('title');
      expect(entity.modified('title')).toBe(true);

    });

    it("returns `false` when an unexisting field is checked", function() {

      var entity = Document.create({}, { exists: true });
      expect(entity.modified('unexisting')).toBe(false);

    });

  });

  describe(".isset()", function() {

    it("returns `true` if a element has been setted", function() {

      var entity = new Document();
      entity.set('field1', 'foo');
      entity.set('field2', null);

      expect(entity.isset('field1')).toBe(true);
      expect(entity.isset('field2')).toBe(true);

    });

    it("returns `true` if a element has been setted using a dotted notation", function() {

      var entity = new Document();
      entity.set('field1.field1', 'foo');
      entity.set('field2.field2', null);

      expect(entity.isset('field1.field1')).toBe(true);
      expect(entity.isset('field2.field2')).toBe(true);

    });

    it("returns false if a element doesn't exist", function() {

      var entity = new Document();
      expect(entity.isset('undefined')).toBe(false);

    });

  });

  describe(".unset()", function() {

    it("unsets items", function() {

      var data = {
        id: 1,
        title: 'test record',
        body: 'test body',
        enabled: true
      };

      var entity = Document.create(data);
      entity.unset('body');
      entity.unset('enabled');

      expect(entity.data()).toEqual({
        id: 1,
        title: 'test record'
      });

    });

    it("unsets items using a dotted notation", function() {

      var entity = new Document();
      entity.set('field1.field1', 'foo');
      entity.set('field2.field2', null);
      entity.unset('field1.field1');
      entity.unset('field2.field2');

      expect(entity.isset('field1.field1')).toBe(false);
      expect(entity.isset('field2.field2')).toBe(false);

    });

  });

  describe(".to()", function() {

    it("exports into an array", function() {

      var data = {
        id: 1,
        title: 'test record'
      };

      var entity = Document.create(data);
      expect(entity.to('array')).toEqual(data);

    });

    it("exports nested relations", function() {

      var data = {
        name: 'amiga_1200.jpg',
        title: 'Amiga 1200',
        tags: [
          { name: 'tag1' }
        ]
      };

      var image = Document.create(data);
      expect(image.data()).toEqual({
        name: 'amiga_1200.jpg',
        title: 'Amiga 1200',
        tags: [
          { name: 'tag1' }
        ]
      });

    });

  });

  describe(".toString()", function() {

    it("returns the title field", function() {

      var data = {
        id: 1,
        title: 'test record'
      };

      var entity = Document.create(data);
      expect(entity.toString()).toBe('test record');

    });

  });

});