import type { LayerType, LayerParams } from './layer';

export type NodeData = {
  type: LayerType;
  label?: string;
  params: LayerParams;
  outputShape?: number[];
  error?: string | null;
  [key: string]: any;
};

export type EdgeData = {
  animated?: boolean;
  [key: string]: any;
};

export interface Project {
  id: number;
  name: string;
  date: string;
  accuracy: string;
  layers: number;
}
