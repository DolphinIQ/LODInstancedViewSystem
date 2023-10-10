# LODInstancedViewSystem
A view system combining Instancing and LODs. Perfect for large scenes containing many (thousands, tens of thousands) objects, like trees in a forest, or street lamps in a city.
It creates a `THREE.InstancedMesh` for every LOD and then manages their transforms based on your list of data objects (usually `THREE.Object3D`s).

### IMPORTANT:
This is a relatively new functionality I wrote, which hasn't been properly tested for all usecases. Use caution, and see `Important things to note` section.

## How to use:

1. Create a mesh list of different LODs (going from highest detail at index 0, to lowest detail), for example:
```js
const treeModels : <THREE.Mesh[]> = [
  highDetailModel // 5k triangles
  mediumDetailModel // 2k tris
  lowDetailModel // 600 tris
  imposterModel // 3 criss-crossed planes for faraway imposters
];
```
2. Create a view system with a mesh list:
```js
const TREE_COUNT = 10_000;
const pinesViewSystem = new LODInstancedViewSystem(
  treeModels, // your LODs mesh list
  TREE_COUNT, // the MAXIMUM amount of entities to be represented by this view system (usually the length of your array of objects from point 1.)
  "pines", // name for this view system
  THREE.StreamDrawUsage // will be assigned to each LOD's InstancedMesh.instanceMatrix.usage, gives a hint to webgl as to how often you intend to update the instance matrix transforms
);
scene.add( pinesViewSystem ); // LODInstancedViewSystem is a THREE.Group so you have to add it to the scene to be visible
```
3. Create a list of your "real" data objects which will be visually represented by the view system:
```js
const treesList = [];
for ( let i = 0; i < TREE_COUNT i++ ) {
  const tree = new THREE.Object3D();
  tree.position.set( i * 3, 0, 0 );
  tree.rotation.y = Math.random() * Math.PI;
  tree.updateMatrix();
  treesList.push( tree );

  // After transforms
  pinesViewSystem.register( tree );
}
```

## Important things to note:
- This system was written to work in combination with some spatial hierarching system, i.e. spatial chunks would determine object data like LOD and visibility, and then provide the view system with ready, only visible objects' matrices, so that the system doesn't have to iterate over hundreds of thousands of objects, determining their visibility and then, if visible, grabbing their matrices one by one every frame. See inside `LODInstancedViewSystem.update()` method to see how it takes in an array of visible Chunks. `visibleChunk.entityGroups` is simply a dictionary of object lists (so for example `{ "pines": treesList }` from the example above. That is why the name also matters in `LODInstancedViewSystem`.

If your object count is couple thousands maximum, you might not need spatial hierarching. In that case, modify the `LODInstancedViewSystem.update()` method to iterate over its `objects` array (populated during `register()`) and then test visibility and get matrices directly from those objects, setting `viewLOD`s instance matrices and count as shown in the original `update()` method.
- Unregistering objects with `LODInstancedViewSystem.unregister()` has not really been tested, do not expect it to work :)
- Adding (registering) new objects to the view system after the initial creation of objects (like the `for` loop example above) has not been tested and may produce unexpected results.

## Happy coding!
DolphinIQ 2023
