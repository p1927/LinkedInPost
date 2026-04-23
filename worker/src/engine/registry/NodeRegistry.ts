import type { NodeDefinition } from '../types';

export class NodeRegistry {
  private readonly nodes = new Map<string, NodeDefinition>();

  /** Registers a node definition. Throws if a node with the same id already exists. */
  register(node: NodeDefinition): void {
    if (this.nodes.has(node.id)) {
      throw new Error(`[NodeRegistry] Node already registered: "${node.id}"`);
    }
    this.nodes.set(node.id, node);
  }

  /** Returns the node definition for the given id. Throws if not found. */
  get(nodeId: string): NodeDefinition {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(
        `[NodeRegistry] Node not found: "${nodeId}". Registered nodes: [${[...this.nodes.keys()].join(', ')}]`,
      );
    }
    return node;
  }

  has(nodeId: string): boolean {
    return this.nodes.has(nodeId);
  }

  /** Returns all registered nodes sorted by id. */
  list(): NodeDefinition[] {
    return [...this.nodes.values()].sort((a, b) => a.id.localeCompare(b.id));
  }
}

export const nodeRegistry = new NodeRegistry();
