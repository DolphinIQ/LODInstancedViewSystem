
import { InstancedMesh, Group, StaticDrawUsage, StreamDrawUsage, DynamicDrawUsage, Mesh, Object3D } from "three";
import { Chunk } from "./../world/chunk.js";

/**
 * id                 0         1         2         3         4         5         6       ^
 * mesh viewLOD0 [ object ][        ][        ][        ][        ][        ][        ]   |
 * mesh viewLOD1 [        ][ object ][ object ][        ][        ][        ][ object ] objects switch between LODs
 * mesh viewLOD2 [        ][        ][        ][        ][        ][ object ][        ]   |
 * mesh viewLOD3 [        ][        ][        ][        ][ object ][        ][        ]   v
 */
class LODInstancedViewSystem extends Group {

    /**
     * 
     * @param { Mesh[] } meshModels - array of models for each LOD, starting from highest resolution at index 0
     * @param { Integer } count - number of all entities to be represented by this view system
     * @param { String } name - name of this view system. MUST BE THE SAME AS CHUNKS ENTITY GROUPS NAME!
     * @param { Number } attributeDrawUsage - THREE.DynamicDrawUsage, StreamDrawUsage, etc.
     */
    constructor( meshModels, count, name, attributeDrawUsage ) {

        super();

        this.meshModels = meshModels;
        this.maxObjectsCount = count;
        this.name = name;

        this.objects = [];

        /** @type InstancedMesh[] */
        this.viewsLOD = [];

        for ( let i = 0; i < meshModels.length; i++ ) {

            const meshModel = meshModels[ i ];

            const meshView = new InstancedMesh( meshModel.geometry, meshModel.material, count );
            meshView.frustumCulled = false;
            meshView.count = 0;
            meshView.matrixAutoUpdate = meshView.matrixWorldAutoUpdate = false;
            meshView.instanceMatrix.usage = attributeDrawUsage || StaticDrawUsage;
            // meshView.instanceMatrix.usage = DynamicDrawUsage;

            meshView.receiveShadow = meshView.castShadow = true;

            meshView.customDepthMaterial = meshModel.customDepthMaterial;
            meshView.customDistanceMaterial = meshModel.customDistanceMaterial;
            meshView.depthPrepassMaterial = meshModel.depthPrepassMaterial;

            this.viewsLOD[ i ] = meshView;
            this.add( meshView );
        }
    }

    /**
     * Registers a new object for this view to represent. Number of registered objects must not exceed the original count
     * @param { Object3D } object 
     */
    register( object ) {

        if ( this.objects.length >= this.maxObjectsCount ) throw new Error("Max object count on this LODInstancedViewSystem exceeded!");

        const defaultLOD = 0;

        this.objects.push( object );
        object.instanceIndex = this.viewsLOD[ defaultLOD ].count;
        object.updateView = () => {
            this.setObjectMatrix( object );
        }

        this.viewsLOD[ defaultLOD ].count += 1;
    }

    unregister( object ) {

        const objectIndex = this.objects.indexOf( object );
        if ( objectIndex > -1 ) {
            this.objects.splice( objectIndex, 1 );
            // delete object.instanceIndex;
            // delete object.updateView;
            this.viewsLOD[ object.currentLOD ].count -= 1;
        }
    }


    setObjectMatrix( object ) {

        const viewLOD = this.viewsLOD[ object.currentLOD ];
        
        // Position appropriate instance at the position
        viewLOD.setMatrixAt( object.instanceIndex, object.matrix );
        viewLOD.instanceMatrix.needsUpdate = true;
    }

    /**
     * 
     * @param { Chunk[] } visibleChunks 
     */
    update( visibleChunks ) {

        // const startTime = performance.now();

        for ( let i = 0, n = this.viewsLOD.length; i < n; i++ ) {

            this.viewsLOD[ i ].count = 0;
            this.viewsLOD[ i ].instanceMatrix.needsUpdate = true;
        }

        // Getting object matrices directly from the chunks ( ~1.28ms / frame with 10k objects )
        for ( let i = 0, l = visibleChunks.length; i < l; i++ ) {

            const visibleChunk = visibleChunks[ i ];
            const viewLOD = this.viewsLOD[ visibleChunk.currentLOD ];
            const entityGroup = visibleChunk.entityGroups[ this.name ];

            // Visible chunk may not always contain entities of the group we are looking for, and will not have said group created
            if ( !entityGroup ) continue;

            viewLOD.instanceMatrix.array.set( entityGroup.entityMatrices, viewLOD.count * 16 );
            viewLOD.count += entityGroup.entities.length;
        }

        // return performance.now() - startTime;
    }

    updateShaders( delta, timeElapsed ) {

        for ( let i = 0, n = this.viewsLOD.length; i < n; i++ ) {

            const viewLOD = this.viewsLOD[ i ];
            if ( viewLOD.material.uniforms ) viewLOD.material.uniforms["timeElapsed"].value = timeElapsed;
            if ( viewLOD.customDepthMaterial && viewLOD.customDepthMaterial.userData.uniforms )
                viewLOD.customDepthMaterial.userData.uniforms["timeElapsed"].value = timeElapsed;
            if ( viewLOD.customDistanceMaterial && viewLOD.customDistanceMaterial.userData.uniforms )
                viewLOD.customDistanceMaterial.userData.uniforms["timeElapsed"].value = timeElapsed;
            if ( viewLOD.depthPrepassMaterial && viewLOD.depthPrepassMaterial.userData.uniforms )
                viewLOD.depthPrepassMaterial.userData.uniforms["timeElapsed"].value = timeElapsed;
        }
    }

    setDepthPrepassMaterial( material, lod ) {

        this.viewsLOD[ lod ].depthPrepassMaterial = material;
    }

    getDepthPrepassMaterial( lod ) {
        return this.viewsLOD[ lod ].depthPrepassMaterial;
    }
}

export { LODInstancedViewSystem };