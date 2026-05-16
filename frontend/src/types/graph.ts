import type { LayerType, LayerParams } from './layer';

export interface NodeData {
  type: LayerType;
  label?: string;
  params: LayerParams;
}

export interface EdgeData {
  animated?: boolean;
}

export interface Project {
  id: number;
  name: string;
  date: string;
  accuracy: string;
  layers: number;
}
