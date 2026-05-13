import { create } from 'zustand';

export type DatasetOption = 'MNIST' | 'CIFAR-10';
export type OptimizerOption = 'Adam' | 'SGD';

export type PipelineConfig = {
  dataset: DatasetOption;
  batchSize: number;
  optimizer: OptimizerOption;
  learningRate: number;
  epochs: number;
};

type PipelineStore = PipelineConfig & {
  setDataset: (dataset: DatasetOption) => void;
  setBatchSize: (batchSize: number) => void;
  setOptimizer: (optimizer: OptimizerOption) => void;
  setLearningRate: (learningRate: number) => void;
  setEpochs: (epochs: number) => void;
};

export const usePipelineStore = create<PipelineStore>((set) => ({
  dataset: 'MNIST',
  batchSize: 64,
  optimizer: 'Adam',
  learningRate: 0.001,
  epochs: 5,
  setDataset: (dataset) => set({ dataset }),
  setBatchSize: (batchSize) => set({ batchSize }),
  setOptimizer: (optimizer) => set({ optimizer }),
  setLearningRate: (learningRate) => set({ learningRate }),
  setEpochs: (epochs) => set({ epochs }),
}));
