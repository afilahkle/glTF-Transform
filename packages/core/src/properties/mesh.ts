import { NotImplementedError } from '../constants';
import { GraphChild, GraphChildList } from '../graph/index';
import { Link } from '../graph/index';
import { Accessor } from './accessor';
import { Material } from './material';
import { Property } from './property';
import { AttributeLink } from './property-links';
import { Root } from './root';

/**
 * # Mesh
 *
 * *Meshes define reusable geometry (triangles, lines, or points) and are instantiated by
 * {@link Node}s.*
 *
 * Each draw call required to render a mesh is represented as a {@link Primitive}. Meshes typically
 * have only a single {@link Primitive}, but may have more for various reasons. A mesh manages only
 * a list of primitives — materials, morph targets, and other properties are managed on a per-
 * primitive basis.
 *
 * When the same geometry and material should be rendered at multiple places in the scene, reuse
 * the same Mesh instance and attach it to multiple nodes for better efficiency. Where the geometry
 * is shared but the material is not, reusing {@link Accessor}s under different meshes and
 * primitives can similarly improve transmission efficiency, although some rendering efficiency is
 * lost as the number of materials in a scene increases.
 *
 * Usage:
 *
 * ```ts
 * const primitive = doc.createPrimitive()
 * 	.setAttribute('POSITION', positionAccessor)
 * 	.setAttribute('TEXCOORD_0', uvAccessor);
 * const mesh = doc.createMesh('myMesh')
 * 	.addPrimitive(primitive);
 * node.setMesh(mesh);
 * ```
 *
 * References:
 * - [glTF → Geometry](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#geometry)
 *
 * @category Properties
 */
export class Mesh extends Property {
	public readonly propertyType = 'Mesh';

	/** Primitive GPU draw call list. */
	@GraphChildList private primitives: Link<Mesh, Primitive>[] = [];

	/** Adds a {@link Primitive} to the mesh's draw call list. */
	public addPrimitive(primitive: Primitive): this {
		return this.addGraphChild(this.primitives, this._graph.link('primitive', this, primitive));
	}

	/** Removes a {@link Primitive} from the mesh's draw call list. */
	public removePrimitive(primitive: Primitive): this {
		return this.removeGraphChild(this.primitives, primitive);
	}

	/** Lists {@link Primitive} draw calls of the mesh. */
	public listPrimitives(): Primitive[] {
		return this.primitives.map((p) => p.getChild());
	}
}

/**
 * # Primitive
 *
 * *Primitives are individual GPU draw calls comprising a {@link Mesh}.*
 *
 * Meshes typically have only a single Primitive, although various cases may require more. Each
 * primitive may be assigned vertex attributes, morph target attributes, and a material. Any of
 * these properties should be reused among multiple primitives where feasible.
 *
 * Primitives cannot be moved independently of other primitives within the same mesh, except
 * through the use of morph targets and skinning. If independent movement or other runtime
 * behavior is necessary (like raycasting or collisions) prefer to assign each primitive to a
 * different mesh. The number of GPU draw calls is typically not unaffected by grouping or
 * ungrouping primitives to a mesh.
 *
 * Usage:
 *
 * ```ts
 * const primitive = doc.createPrimitive()
 * 	.setAttribute('POSITION', positionAccessor)
 * 	.setAttribute('TEXCOORD_0', uvAccessor)
 * 	.setMaterial(material);
 * mesh.addPrimitive(primitive);
 * node.setMesh(mesh);
 * ```
 *
 * References:
 * - [glTF → Geometry](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#geometry)
 *
 * @category Properties
 */
export class Primitive extends Property {
	public readonly propertyType = 'Primitive';

	/** GPU draw mode. */
	private _mode: GLTF.MeshPrimitiveMode = GLTF.MeshPrimitiveMode.TRIANGLES;

	/** Indices of vertices in the vertex list to be drawn. */
	@GraphChild private _indices: Link<Primitive, Accessor> = null;

	/** Vertex attributes. */
	@GraphChildList private _attributes: AttributeLink[] = [];

	// @GraphChildList private targets: AttributeLink[][] = [];

	/** Material used to render the primitive. */
	@GraphChild private _material: Link<Primitive, Material> = null;

	/** Returns an {@link Accessor} with indices of vertices to be drawn. */
	public getIndices(): Accessor {
		return this._indices ? this._indices.getChild() : null;
	}

	/**
	 * Sets an {@link Accessor} with indices of vertices to be drawn. In `TRIANGLES` draw mode,
	 * each set of three indices define a triangle. The front face has a counter-clockwise (CCW)
	 * winding order.
	 */
	public setIndices(indices: Accessor): this {
		this._indices = this._graph.linkIndex('index', this, indices) as Link<Primitive, Accessor>;
		return this;
	}

	/** Returns a vertex attribute as an {@link Accessor}. */
	public getAttribute(semantic: string): Accessor {
		const link = this._attributes.find((link) => link.semantic === semantic);
		return link ? link.getChild() : null;
	}

	/**
	 * Sets a vertex attribute to an {@link Accessor}. All attributes must have the same vertex
	 * count.
	 */
	public setAttribute(semantic: string, accessor: Accessor): this {
		const link = this._graph.linkAttribute(semantic.toLowerCase(), this, accessor) as AttributeLink;
		link.semantic = semantic;
		return this.addGraphChild(this._attributes, link);
	}

	/**
	 * Lists all vertex attribute {@link Accessor}s associated with the primitive, excluding any
	 * attributes used for morph targets. For example, `[positionAccessor, normalAccessor,
	 * uvAccessor]`. Order will be consistent with the order returned by {@link .listSemantics}().
	 */
	public listAttributes(): Accessor[] {
		return this._attributes.map((link) => link.getChild());
	}

	/**
	 * Lists all vertex attribute semantics associated with the primitive, excluding any semantics
	 * used for morph targets. For example, `['POSITION', 'NORMAL', 'TEXCOORD_0']`. Order will be
	 * consistent with the order returned by {@link .listAttributes}().
	 */
	public listSemantics(): string[] {
		return this._attributes.map((link) => link.semantic);
	}

	/** @hidden */
	public listTargets(): Accessor[][] {
		throw new NotImplementedError();
	}

	/** @hidden */
	public listTargetNames(): string[] {
		throw new NotImplementedError();
	}

	/** Returns the material used to render the primitive. */
	public getMaterial(): Material { return this._material ? this._material.getChild() : null; }

	/** Sets the material used to render the primitive. */
	public setMaterial(material: Material): this {
		this._material = this._graph.link('material', this, material) as Link<Primitive, Material>;
		return this;
	}

	/**
	 * Returns the GPU draw mode (`TRIANGLES`, `LINES`, `POINTS`...) as a WebGL enum value.
	 *
	 * Reference:
	 * - [glTF → `primitive.mode`](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#primitivemode)
	 */
	public getMode(): GLTF.MeshPrimitiveMode { return this._mode; }

	/**
	 * Sets the GPU draw mode (`TRIANGLES`, `LINES`, `POINTS`...) as a WebGL enum value.
	 *
	 * Reference:
	 * - [glTF → `primitive.mode`](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#primitivemode)
	 */
	public setMode(mode: GLTF.MeshPrimitiveMode): this {
		this._mode = mode;
		return this;
	}
}