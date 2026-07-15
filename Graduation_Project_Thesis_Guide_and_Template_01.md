**Weave:**

***An Intelligent Visual Studio for Deep Learning***

![](data:image/png;base64...)

A graduation project thesis submitted in partial fulfillment of the

requirements for the degree of Bachelor of Engineering

**Prepared by**

Ahmed Mahmoud Dawoud

Ahmed Mohamed Elmahalwey

Omar Osama Elzarka

Sara Essam Eldein Ahmed

**Under the supervision of**

Dr. Heba Gamal

*June 2026*

*2025 – 2026*

# Table of Contents

[Table of Contents 2](#_Toc234692787)

[Abstract 4](#_Toc234692788)

[Abstract (Arabic) 5](#_Toc234692789)

[Acknowledgements 6](#_Toc234692790)

[List of Figures, Tables, and Abbreviations 7](#_Toc234692791)

[Tables List 7](#_Toc234692792)

[Figures List 7](#_Toc234692793)

[Abbreviations 7](#_Toc234692794)

[Chapter 1: Introduction 8](#_Toc234692795)

[1.1 Background and Motivation 8](#_Toc234692796)

[1.2 Problem Statement 9](#_Toc234692797)

[1.3 Objectives 9](#_Toc234692798)

[1.4 Scope and Limitations 9](#_Toc234692799)

[1.4.1. Scope: 9](#_Toc234692800)

[1.5 Thesis Organization 10](#_Toc234692801)

[Chapter 2: Background and Literature Review 11](#_Toc234692802)

[2.1 Theoretical Background 11](#_Toc234692803)

[2.1.1. Tensor Multi-Dimensional Array Representations 11](#_Toc234692804)

[2.1.2. Spatial Layer Transformations and Shape Equations 11](#_Toc234692805)

[2.1.3. Static Graph vs. Dynamic Computation Graphs 12](#_Toc234692806)

[2.1.4. Abstract Syntax Trees (AST) and Transpilation 13](#_Toc234692807)

[2.2 Related Work 14](#_Toc234692808)

[2.2.1. Comparative Analysis of Existing Frameworks 14](#_Toc234692809)

[2.2.2. Detailed Synthesis of Related Approaches: 14](#_Toc234692810)

[2.3 Research Gap 15](#_Toc234692811)

[Chapter 3: Market Study: 16](#_Toc234692812)

[3.1. Introduction to the Market Landscape 16](#_Toc234692813)

[3.2. Analysis of Commercial & Industry Systems 16](#_Toc234692814)

[3.2.1. TensorBoard® 16](#_Toc234692815)

[3.2.2. Lobe.ai (Microsoft) ® 17](#_Toc234692816)

[3.2.3. KNIME® 18](#_Toc234692817)

[3.2.4 TorchStudio® 19](#_Toc234692818)

[3.2.5 IBM Watson Studio 20](#_Toc234692819)

[3.3. Comparative Evaluation Matrix 21](#_Toc234692820)

[3.4. Engineering Requirements & Strategic Evaluation 22](#_Toc234692821)

[3.4.1. House of Quality (HOQ) 22](#_Toc234692822)

[3.4.2. SWOT Analysis 23](#_Toc234692823)

[3.5. Competitive Advantages of Weave 24](#_Toc234692824)

[3.6. Market Gap Conclusion 24](#_Toc234692825)

[Chapter 3: Proposed System and Methodology 25](#_Toc234692826)

[3.1 System Overview / Architecture 25](#_Toc234692827)

[3.2 Dataset 25](#_Toc234692828)

[3.3 Methodology / Model Design 25](#_Toc234692829)

[3.4 Tools and Technologies 25](#_Toc234692830)

[Chapter 4: Implementation 26](#_Toc234692831)

[4.1 Implementation Details 26](#_Toc234692832)

[4.2 User Interface / Deployment 26](#_Toc234692833)

[Chapter 5: Results and Discussion 27](#_Toc234692834)

[5.1 Experimental Setup and Metrics 27](#_Toc234692835)

[5.2 Results 27](#_Toc234692836)

[5.3 Discussion 27](#_Toc234692837)

[Chapter 6: Conclusion and Future Work 28](#_Toc234692838)

[6.1 Conclusion 28](#_Toc234692839)

[6.2 Limitations 28](#_Toc234692840)

[6.3 Future Work 28](#_Toc234692841)

[References 29](#_Toc234692842)

[Appendices 30](#_Toc234692843)

[Appendix A: [ Title ] 30](#_Toc234692844)

[General Guidelines (Read Once Before You Start) 31](#_Toc234692845)

[Writing Style 31](#_Toc234692846)

[Formatting 31](#_Toc234692847)

[Figures, Tables, and Equations 31](#_Toc234692848)

[Referencing (IEEE Style) 31](#_Toc234692849)

[Submission Checklist 32](#_Toc234692850)

# Abstract

Developing deep learning models remains a needless technical and error-prone process, as practitioners must contend with complex programming frameworks, repetitive boilerplate code, and difficult-to-diagnose issues like tensor shape mismatches, while lacking any means to visually inspect network architecture or trace data flow during the design phase.

To solve this problem, **Weave** was developed, which is a *visual integrated development environment (IDE),* that allows users to construct neural network architectures, such as for example nested subgraphs, skip connections, and custom autograd blocks, through a **drag-and-drop interface**, and automatically generating a clean, and executable PyTorch code in background.

This system is built using a hybrid microservice architecture, by combining: **React-based frontend**, **ASP.NET Core gateway** for secure communication, and **Python execution engine** which can handle tasks such as code synthesis, shape inference, and local training.

In order to evaluate this platform, a range of representative model architectures, spanning simple sequential networks to more complex structures involving branching and custom components, were constructed within the platform, and was tested to ensure a correct code generation, an accurate real-time shape propagation, and finally a reliable error diagnosis, while the resulting models were trained and exported to verify functional correctness end to end.

This evaluation demonstrated that **Weave** consistently produced a valid, trainable PyTorch implementations, correctly flagged architectural inconsistencies, and translated cryptic error messages into clear, actionable guidance, ensuring that this platform reduces the technical overhead of deep learning development while also improving reliability and accessibility for novice and experienced practitioners.

**Keywords:**

*deep learning, visual programming, integrated development environment, neural network architecture design, automatic code generation, PyTorch.*

# ![](data:image/png;base64...)Abstract (Arabic)

**الكلمات المفتاحية:**

التعلم العميق، البرمجة المرئية، بيئة تطوير متكاملة، تصميم معماريات الشبكات العصبية، التوليد التلقائي للأكواد، PyTorch

# Acknowledgements

We would like to express our deepest gratitude to Dr. Heba Gamal, Head of the Smart Systems Engineering Department and our project supervisor, for her continuous guidance, invaluable support, insightful feedback, and encouragement throughout every stage of this project. Her expertise, patience, and dedication have played a vital role in the successful completion of this work.

We also extend our sincere appreciation to all the professors, teaching assistants, and staff members of the Smart Systems Engineering Department, as well as the Faculty of Engineering, Kafrelsheikh University, for their support, knowledge, and commitment to providing an excellent academic environment that has greatly contributed to our education and the completion of this project.

Finally, we are grateful to everyone who provided support, resources, or encouragement during this project. Their contributions, whether direct or indirect, are deeply appreciated.

# List of Figures, Tables, and Abbreviations

### Tables List

[Table 1 Comparative Analysis of Existing Frameworks [1], [3], [5] 14](#_Toc234692851)

[Table 2 Table 2 Comparative Analysis of Industry Platforms 21](#_Toc234692852)

### Figures List

[Figure 1 THE TRANSFORMER MODEL ARCHITECTURE 8](#_Toc234692853)

[Figure 2 STATIC COMPUTATION GRAPH WORKFLOW (e.g., TensorFlow 1.x) 12](#_Toc234692854)

[Figure 3 DYNAMIC COMPUTATION GRAPH WORKFLOW (e.g., PyTorch) 13](#_Toc234692855)

[Figure 4 13](#_Toc234692856)

[Figure 5 TensorBoard Interface (1) Image source: www.tensorflow.org 16](#_Toc234692857)

[Figure 6 TensorBoard Interface (2) 16](#_Toc234692858)

[Figure 7 Lobe.ai Interface 17](#_Toc234692859)

[Figure 8 KNIME Interface 18](#_Toc234692860)

[Figure 9 Multiple screens from TorchStudio GUI 19](#_Toc234692861)

[Figure 10 Implement explainable AI By IBM 20](#_Toc234692862)

[Figure 11 House of Quality (HOQ) 22](#_Toc234692863)

[Figure 12 SWOT Analysis 23](#_Toc234692864)

### Abbreviations

| **Abbreviation** | **Meaning** |
| --- | --- |
| IDE | *Integrated Development Environment* |
| API | *Application Programming Interface* |
| UI | *User Interface* |
| ONNX | *Open Neural Network Exchange* |
| GPU | *Graphics Processing Unit* |
| HTTP | *Hypertext Transfer Protocol* |
| AST | *Abstract Syntax Trees* |
| PEP8 | *Python Enhancement Proposal 8.* |
| NLDS | *Neural Language Definition Standard* |
| AI | *Artificial Intelligence* |
| ETL | *Extract, Transform, and Load (Traditional Machine Learning)* |
| GUI | *Graphical User Interface* |
| QFD | *Quality Function Deployment* |
| HOQ | *House of Quality* |

# Chapter 1: Introduction

## Background and Motivation

The democratization of artificial intelligence faces structural barriers across educational institutions, small research teams, and industry newcomers. Modern deep learning engineering relies heavily on imperative, framework-specific code abstractions [1]. While architectural concepts are universally shared as clean visual graphs or flowcharts in peer-reviewed scientific literature, such as the landmark encoder-decoder stack diagrams introduced in the Transformer model architecture [2] practitioners must manually map these geometric layouts into raw code configurations.

Figure 1: The Transformer model architecture shows complex multi-head attention and feed-forward layers [2]

![](data:image/png;base64...)This manual visual-to-syntax translation process demands intense framework-specific training, introducing widespread implementation errors and creating unnecessary technical overhead. Research into abstract design frameworks shows that visual programming environments drastically reduce this cognitive load, shifting a developer's focus from boilerplate syntax mechanics toward high-level neural topology design [1]. By allowing practitioners to construct deep learning pipelines as visual flowcharts, visual development environments bypass low-level programming complexities, making model architecture design immediate and accessible to domain experts and early-stage learners alike [3]

Figure THE TRANSFORMER MODEL ARCHITECTURE

## 1.2 Problem Statement

Developing deep learning architectures remains unnecessarily difficult because of deep framework complexity, repetitive implementation boilerplate, and highly disruptive runtime debugging loops [4]. A sever challenge stems from tensor shape mismatch errors, which are very difficult to detect manually before execution since standard code editors cannot statically infer structural dimensions across complex linear layers, convolutions, and pooling operations [4]

Because modern deep learning frameworks evaluate tensor operations dynamically, a mismatch bug will often lie latent until a specific layer execution is triggered, abruptly terminating the program [4]. This unexpected failure discards hours of time-consuming training progress, wastes costly GPU computational energy, and deletes intermediate learned states [4]. Empirical benchmark data confirms that structural API misuses and multi-dimensional shape mismatches represent a primary driver of runtime crashes in machine learning codebases [5] This issue is severely compounded by "dataflow blindness" existing command-line code editors offer no native mechanism to visually audit an architecture's topology or trace complex tensor propagation shapes during the design phase, forcing practitioners to mentally keep track of high-dimensional matrix operations before initiating a compilation run.

## 1.3 Objectives

1. Design a visual drag-and-drop interface used for constructing neural network architectures, including nested subgraphs, skip connections, and custom autograd blocks.
2. Implement real-time, and compilation-free tensor shape inference to catch architectural errors during design rather than at runtime.
3. Automatically generate clean, executable PyTorch code from the visual representation.
4. Support full workflow end-to-end: data ingestion, training, live monitoring, inference testing, and export to production formats (ONNX, TorchScript).

## 1.4 Scope and Limitations

### 1.4.1. Scope:

Weave is engineered as a hybrid structural development ecosystem targeting local GPU compilation mediated by lightweight cloud states.

The platform includes full visualization controls, shape validation engines, automated transpolar components translating visual layouts to PyTorch syntax, and live browser logging pipelines.

**Constraints applied to this design release include:**

* **Framework Boundary:** Custom visual components transpile natively to the PyTorch syntax configurations. High-level multi-framework abstract pipelines targeting alternate systems like TensorFlow or Keras are excluded.
* **Local Hardware Dependency**: Computationally expensive model generation and execution loops run directly on the practitioner’s computing hardware, meaning training capacity is constrained by the local machine's memory limits and GPU availability.

## 1.5 Thesis Organization

***Guidance —*** *One short paragraph summarising what each remaining chapter covers (“Chapter 2 reviews… Chapter 3 describes…”). Keep it to one or two sentences per chapter.*

*[ Write your text here. ]*

# Chapter 2: Background and Literature Review

## 2.1 Theoretical Background

To fully understand the design of a visual IDE like Weave, it is crucial to analyze the mathematical and structural mechanisms that administrate modern deep learning, tensor transformations, and programmatic execution systems. Deep learning models operate as computational directed acyclic graphs (DAGs) where structural layer nodes process multi-dimensional data arrays called tensors.

### 2.1.1. Tensor Multi-Dimensional Array Representations

In deep learning, structural data is represented as a high-dimensional tensor abstraction to maximize parallel computing efficiency across acceleration hardware like GPUs [1]. As for computer vision pipelines, a standard feature map tensor $T$ is mathematically structured across a four-dimensional coordinate space [6]:

$$T=R^{B\*C\*H\*W}$$

*Where:*

* $B:$ **Batch Size** (the number of training samples processed concurrently in a single forward-backward pass) [1], [6].
* $C:$ **Channels** (e.g., $C=3$for standard RGB color spaces or variable feature depths in hidden layers) [6].
* $H:$ **Height** of the feature matrix spatial grid [6].
* $W:$ **Width** of the feature matrix spatial grid [6].

This structural order $\left(B\*C\*H\*W\right) $represents the standard contiguous memory layout convention utilized by **PyTorch**'s underlying tensor library, that directly dictates how subsequent spatial transformation nodes index and process data vectors [1].

### 2.1.2. Spatial Layer Transformations and Shape Equations

When a tensor passes through adjacent spatial manipulation nodes, the dimensions alter deterministically based on structural layer hyperparameters such as strides and kernels [7]. A standard 2D Convolutional layer **Conv2d** maps an input tensor to output tensor by computing the spatial shrinkage or expansion [7].

Given input height $H\_{in}$ / width $W\_{in}$ , the resulting output spatial dimensions $H\_{out}$ / $W\_{out}$ are calculated via the following spatial transformation formula [7]:

$$H\_{out}=\left⌊\frac{H\_{in}+2P - K}{S}\right⌋+1$$

$$W\_{out}=\left⌊\frac{W\_{in}+2P - K}{S}\right⌋+1$$

*Where:*

* $K:$ **Kernel** (Filter) Size [7].
* $P:$ **Padding** Size applied to input borders [7].
* $S:$ **Stride Rate** of moving filter window[7]**.**
* $\left⌊...\right⌋ $denotes the floor operation, enforcing integer truncation of coordinate space [7].

Similarly, when transitioning from spatial representations to fully connected flat networks, a structural transformation flattening operation must occur. A tensor of shape $\left(B,C,H,W\right) $flattening into a vector map requires computing a matrix multiplication input size matching [1]:

*Input Linear Features = C \* H \* W*

If succeeding Linear node's weight matrix does not align with the dimension, a runtime evaluation failure occurs [1]:

RuntimeError: mat1 and mat2 shapes cannot be multiplied (64x576 and 512x256)

*This error represents the* ***Tensor Shape Mismatch*** *barrier that* ***Weave*** *solves through design-time graph validation.*

### 2.1.3. Static Graph vs. Dynamic Computation Graphs

Modern deep learning frameworks handle graph state compilation in two distinct ways—either as static dataflow graphs or dynamically generated structures [1]. Figures 2, 3

**![](data:image/png;base64...)**

Figure STATIC COMPUTATION GRAPH WORKFLOW (e.g., TensorFlow 1.x)

![](data:image/png;base64...)

Figure DYNAMIC COMPUTATION GRAPH WORKFLOW (e.g., PyTorch)

PyTorch relies heavily on imperative, Dynamic Computation Graph paradigm utilizing an autograd execution engine. The network structure is built dynamically during the forward execution pass [1].

While this approach provides deep runtime flexibility, it makes ahead-of-time debugging extremely difficult for text-based code editors. Since that shapes are computed during the code execution rather than the compilation, the dimension bugs remain completely hidden until runtime execution hits that specific layer.

### 2.1.4. Abstract Syntax Trees (AST) and Transpilation

A visual IDE bridges the graph layouts and raw framework scripts through program transpilation. When nodes are wired on a canvas, the underlying graphical data architecture translates into a high-level data topology structure.

![](data:image/png;base64...)This model structure reflects an **Abstract Syntax Tree (AST)**, which is a hierarchical tree representation of structural program syntax [8]. The code generation compiler walks this architectural tree graph step by step, validating node connections and translating them into clean, **PEP8-compliant** PyTorch code structures.

Figure

The transformation process mapping user-defined graph data structures into a validated AST hierarchy

## 2.2 Related Work

In order to contextualize the development of Weave within the existing academic landscape, it is critical to analyze the previous attempts at resolving the barriers of structural deep learning design and tensor dimensionality confirmation.

Existing literature typically falls into two domains: **Visual Programming Frameworks** which streamline the graph layout process, and **Static Program Analyzers** which focus on code-level tensor shape validation.

### 2.2.1. Comparative Analysis of Existing Frameworks

The table below, **Table 1**, establishes a structural evaluation matrix mapping Weave against prominent modern baselines across foundational criteria.

Table Comparative Analysis of Existing Frameworks [1], [3], [5]

| **Framework / Reference** | **Real-Time Validation** | **Multi-Library Transpilation** | **Zero-Code Editing** | **Ahead-of-Time Shape Tracking** | **Design-Time Error Catching** | **Native PyTorch Optimization** |
| --- | --- | --- | --- | --- | --- | --- |
| DL-IDE  (Sankaran et al.) | ***YES*** | ***YES***  ***(NLDS)*** | ***YES*** | ***NO*** | **Partial**  **(Hyperparameters)** | ***No*** |
| PyTea  (Jhoo et al.) | ***NO*** | ***NO*** | ***NO*** | ***YES*** | **Yes (Constraint Solvers)** | ***YES*** |
| Jhoo et al. Analyzer | ***NO*** | ***NO*** | ***NO*** | ***YES*** | **Yes (Static Type Inference)** | ***YES*** |
| JunoBench Diagnostics | ***NO*** | ***NO*** | ***NO*** | ***NO*** | **No (Post-Crash Repair)** | ***Partial*** |
| **Weave**  **(Proposed)** | ***YES*** | ***YES***  ***(AST)*** | ***YES*** | ***YES*** | **Yes (Instant Canvas Feedback)** | ***YES*** |

### 2.2.2. Detailed Synthesis of Related Approaches:

#### **2.2.2.1. Abstract Visual Programming Frameworks**

Early visual environments targeted democratization, but often they isolated themselves from the raw script frameworks. Sankaran et al. proposed *DL-IDE*, which applied an abstract format named the *Neural* **Language Definition Standard (NLDS),** in order to decouple model design from target framework syntaxes, effectively generating multi-library training scripts. While vastly capable of validating manual architectural hyperparameter ranges in real-time, the NLDS engine lacked a deterministic spatial propagation model. It could check if a kernel size parameter was an integer, but could not compute or predict downstream spatial feature map sizes across deep compositional networks, shifting the resolution of structural channel mismatches entirely to runtime. [1]

#### **2.2.2.2. Static Analysis and Automated Diagnostic Tooling**

Contrariwise, code-level static analysis research operates completely in text files. Jhoo et al. introduced a type-based automated static analyzer named PyTea [3], which is able to execute the best-effort shape inference in order to capture structural tensor mismatches ahead of execution loop boundaries.

Given a raw input script, PyTea collects tensor shape constraints crosswise execution paths and evaluates them by using internal constraint solver. Similarly, benchmark studies such as JunoBench [5], have highlighted that tensor shape mismatches and execution order faults represent the vast majority of real-world machine learning code failures in development environments.

However, because these traditional static systems process a raw, non-compiled pythonic text file, they face structural limitations:

* They depend on complex constraint solvers / heavy type-inference engines which can be computationally slow.
* They provide output error details only as secondary terminal trace logs after code files are saved and evaluated, lacking interactive connection to the initial structural planning interface.

## 2.3 Research Gap

This distinct bifurcation in literature, and commercial products emphasizes the structural gap that Weave resolves. By embedding a deterministic, mathematical shape-propagation module directly within an Abstract Syntax Tree (AST) visual transpiler pipeline, Weave achieves simultaneous real-time visual canvas building and ahead-of-time tensor shape validation. The developer receives instant structural validation at design time, completely eliminating the standard wait-and-crash debugging loops typical of text-based dynamic graph engines.

# Chapter 3: Market Study:

## 3.1. Introduction to the Market Landscape

While academic literature focuses primarily on abstract paradigms, several commercial platforms have attempted to bring visual node editing to deep learning workflows. These tools aim to minimize script-authoring complexity but generally fell short when managing dynamic, shape-dependent framework execution.

Developing a deep learning model has been a syntax-heavy, error-prone procedure dominated by text-based development environments. To ease this cognitive load, commercial industries next to academic researchers have attempted to build visual frameworks or automated tools.

This chapter provides a market study and comparative analysis of existing platforms. the solutions are diverged into distinct paradigms:

1. **Academic Static Analyzers**:

Code-level tools focused on error checking. *(mentioned on the previous chapter).*

1. **Commercial AutoML "Black Boxes":**

High-level applications that hide model intricacies. (will briefly discussed in this chapter).

1. **General Node Based Data Science Platforms:**

Flowchart-driven systems not optimized for modern deep learning.

## 3.2. Analysis of Commercial & Industry Systems

### 3.2.1. TensorBoard®

TensorBoard is an industry-standard utility for machine learning lifecycle visualization. It provides developers with monitoring of validation curves, loss metrics, and operational graphs. [9]

![](data:image/png;base64...)![](data:image/png;base64...)

Figure TensorBoard Interface (1) Image source: [www.tensorflow.org](http://www.tensorflow.org)

Figure TensorBoard Interface (2)

Image source: [www.tensorflow.org](http://www.tensorflow.org)

However, TensorBoard functions is passive, post-hoc monitoring tool. It offers no architectural design capabilities, cannot be used to modify layer configurations, and provides no standalone code-generation features.

### 3.2.2. Lobe.ai (Microsoft) ®

Lobe.ai targets beginners and non-programmers by an accessible, and simplified user interface. Users supply datasets, and the platform automates model selection and training. While efficient for straightforward tasks, it represents a **"Black Box**" paradigm. [10]

![](data:image/png;base64...)

Figure Lobe.ai Interface

Image source: <https://lobe.ai/>

But it explicitly blocks engineers from fine-tuning layer hyperparameters (like strides, padding, and custom kernels), restricts development to basic classification topologies, and completely lacks native, editable script exports.

### 3.2.3. KNIME®

KNIME is an enterprise project, complete data science ecosystem that utilizes visual node-based workflows for data extraction, transformation, and traditional machine learning (ETL). [11]

![](data:image/png;base64...)

Figure KNIME Interface

Image source: <https://lobe.ai/>

While its generic node library is expansive, its deep learning integration is unwieldly, limited, and **not PyTorch native**. It cannot handle complex, modern structural concepts easily, like multi-head attention mechanisms, transformer blocks, or custom skip-connections.

### 3.2.4 TorchStudio®

It is a desktop IDE built for PyTorch ecosystem development, it offers a local dataset exploration and hardware-mediated execution. [12]

![](data:image/png;base64...)

Figure Multiple screens from TorchStudio GUI

Image source: <https://www.torchstudio.ai/>

However, it serves firmly to visualize **pre-existing models**. And does not allow developers to construct new network topologies from scratch on the canvas; structural alterations must still be coded manually in Python. Furthermore, its development activity has been inactive since *2023*, presenting long-term support risks.

### 3.2.5 IBM Watson Studio

IBM Studio focuses on enterprise-level automated ML pipelines. It abstracts the components into high-level pipeline blocks, linking data ingestion to automated cloud-based training routines. [13]

![](data:image/jpeg;base64...)

Figure Implement explainable AI By IBM

Image source: <https://www.ibm.com/products/watson-studio>.

However, since it operates far above fine-grained layer operations, it hides layer-by-layer spatial transformations from the visual canvas, preventing design-time structural analysis.

## 3.3. Comparative Evaluation Matrix

The **Table 2** below shows a structural evaluation matrix mapping Weave against some commercial baselines across key architectural criteria

Table Table 2 Comparative Analysis of Industry Platforms

| **Evaluation Features** | **![](data:image/png;base64...)** | **![](data:image/jpeg;base64...)** | **![](data:image/png;base64...)** | **![](data:image/png;base64...)** | **![](data:image/png;base64...)** | **![](data:image/png;base64...)** |
| --- | --- | --- | --- | --- | --- | --- |
| **Visual Architecture Design** | ***NO*** | ***YES*** | ***YES*** | ***NO*** | ***NO*** | ***YES*** |
| **PyTorch Native Ecosystem** | ***NO*** | ***NO*** | ***NO*** | ***YES*** | ***NO*** | ***YES*** |
| **Granular Layer Manipulation** | ***NO*** | ***NO*** | **Partial** | ***NO*** | ***NO*** | ***YES*** |
| **Transparent Code Export** | ***NO*** | ***NO*** | **Partial** | **Partial** | ***NO*** | ***YES (PEP8 PyTorch)*** |
| **Compile-Free Shape Inference** | ***NO*** | ***NO*** | ***NO*** | ***NO*** | ***NO*** | ***YES (Real-Time AST)*** |
| **Local GPU Execution** | ***YES*** | ***YES*** | ***NO*** | ***NO*** | ***NO*** | ***YES*** |
| **Active Development** | ***YES*** | ***YES*** | ***YES*** | ***NO*** | ***YES*** | ***YES*** |

## 3.4. Engineering Requirements & Strategic Evaluation

In order to translate these market gaps into concrete engineering milestones, a dual strategic approach was deployed. First, a **Quality Function Deployment (QFD)** House of Quality matrix was done, to map user requirements to technical design characteristics. Second, a **SWOT analysis** was constructed to evaluate the platform’s strategic positioning within the current machine learning ecosystem.

### 3.4.1. House of Quality (HOQ)

The House of Quality guarantees that the developer's operational pain points dictate the underlying software architecture.

![](data:image/png;base64...)

Figure House of Quality (HOQ)

#### **Engineering Direction Matrix**

* **ST Parser & Shape Engine Correlation:**

A highly positive engineering correlation exists here. The AST must accurately parse node properties before the shape propagation engine can compute spatial dimension shifts $(H\_{out}$ , $W\_{out})$ mathematically by:

$$H\_{out}=\left⌊\frac{H\_{in}+2P - K}{S}\right⌋+1$$

* **Technical Tradeoffs:**

Increasing the real-time parsing depth of the canvas UI may lead to introduce layout latency. so, the shape inference engine is decoupled from the main UI rendering thread using web workers to preserve canvas reactivity.

### 3.4.2. SWOT Analysis

The following strategic matrix highlights the internal capabilities and external landscape defining Weave's viability as a modern alternative to traditional IDEs. **Figure 12**

![](data:image/png;base64...)

Figure SWOT Analysis

## 3.5. Competitive Advantages of Weave

Weave resolves clear industry bifurcation between simplistic visual apps and text environments, it is doing that by combining an interactive visual canvas with real-time, compile-free shape propagation. The key architectural differentiators include:

* **Ahead of Time Shape Inference Engine:**

Unlike dynamic graph frameworks that crash mid-training because of mismatched matrix operation, Weave calculates spatial transformations on the fly, highlighting incompatible connections instantly at design time.

* **Transparent Code Generation:**

Dose not hide its internal mechanisms in a **“black box”.** it maintains complete structural transparency by transpiling graphical data directly into clean, PEP8-compliant PyTorch code, that remains fully editable outside the application.

* **Hybrid Execution Topology:**

While traditional cloud tools lock users into expensive remote hardware, Weave utilizes a hybrid setup. The frontend runs in any modern browser while heavy training loops execute locally on the practitioner's native GPU, avoiding complex SaaS hosting dependencies.

## 3.6. Market Gap Conclusion

As Previously demonstrated, the existing options force researchers to choose between high-level visual tools that lack flexibility, or text-only code environments vulnerable to latent shape mismatch bugs.

Weave targets this structural gap. By integrating a shape-propagation engine directly into a visual Abstract Syntax Tree (AST) transpilation pipeline, it removes technical friction from deep learning development while ensuring end-to-end reliability.

# Chapter 4: Proposed System and Methodology

***Guidance —*** *Around 6–10 pages and the technical heart of the thesis. Describe what you designed and the method you followed, in enough detail that a competent reader could reproduce it. Use the past tense and a neutral, objective voice.*

## 4.1 System Overview / Architecture

***Guidance —*** *Start with a single block diagram of the whole system, then describe each block. The diagram should let a reader grasp the design in one glance before the details.*

*[ Insert system architecture diagram here. Caption it: Figure 3.1 — System architecture. ]*

*[ Write your text here. ]*

## 4.2 Dataset

***Guidance —*** *Describe the data: its source, size, format, classes/labels, and how it was split into training, validation, and test sets. State any pre-processing, cleaning, augmentation, or balancing you applied. If you collected your own data, explain how. Be honest about data quality and any missing values.*

*[ Write your text here. ]*

## 4.3 Methodology / Model Design

***Guidance —*** *Explain your approach step by step: the model or algorithm, its components, the loss function, and the key design choices. Justify each major decision — why this model, why these hyper-parameters, why this metric. Include equations with numbers (Eq. 3.1, 3.2…).*

*[ Write your text here. ]*

## 4.4 Tools and Technologies

***Guidance —*** *List the languages, frameworks, libraries, and hardware you used (e.g. Python, TensorFlow/PyTorch, GPU model). A short bulleted list is fine.*

* [ Programming language and version ]
* [ Main frameworks / libraries ]
* [ Hardware / environment ]

# Chapter 5: Implementation

***Guidance —*** *Around 4–7 pages. Describe how the design from Chapter 3 became a working system. Focus on the interesting and non-obvious parts — not every line of code. Use short, well-captioned code snippets only where they add real insight; put long code in an appendix.*

## 5.1 Implementation Details

***Guidance —*** *Walk through the main modules and how they fit together. Explain the data pipeline, training procedure, and any engineering challenges you solved and how.*

*[ Write your text here. ]*

## 5.2 User Interface / Deployment

***Guidance —*** *If your project has an interface, an API, or a deployment, describe it here and include screenshots. If not, you can remove this section.*

*[ Insert screenshots here, captioned Figure 4.x. Remove this section if not applicable. ]*

# Chapter 6: Results and Discussion

***Guidance —*** *Around 5–8 pages. Present what you found, then interpret it. Keep “results” (the numbers and figures) and “discussion” (what they mean) clearly separated. Do not hide weak results — explaining them well shows maturity.*

## 6.1 Experimental Setup and Metrics

***Guidance —*** *State exactly how you evaluated: the metrics (accuracy, F1, RMSE, latency, etc.), the test data, and the baselines you compared against. Define each metric briefly so the reader can interpret the numbers.*

*[ Write your text here. ]*

## 6.2 Results

***Guidance —*** *Present results in tables and figures, each with a number and caption. Refer to every table/figure in the text (“As shown in Table 5.1…”). Report numbers consistently — same units, same number of decimal places.*

*[ Insert results table here. Caption: Table 5.1 — Performance comparison. ]*

*[ Write your text here. ]*

## 6.3 Discussion

***Guidance —*** *Interpret the results. Why did your method perform as it did? Compare with the related work from Chapter 2. Explain failures and surprises. Connect the findings back to your objectives in Chapter 1.*

*[ Write your text here. ]*

# Chapter 7: Conclusion and Future Work

***Guidance —*** *Around 2–3 pages. Close the loop. No new results here — only summary, reflection, and outlook.*

## 7.1 Conclusion

***Guidance —*** *Restate the problem, what you did, and your main findings in a few short paragraphs. Make it clear that each objective from Chapter 1 was met.*

*[ Write your text here. ]*

## 7.2 Limitations

***Guidance —*** *Honestly state what your solution does not do well and under what conditions it may fail. This is expected and respected in good engineering work.*

*[ Write your text here. ]*

## 7.3 Future Work

***Guidance —*** *Suggest concrete next steps that would extend or improve the project. Be specific enough that another team could pick them up.*

* [ Future direction 1 ]
* [ Future direction 2 ]

# References

|  |  |
| --- | --- |
| [1] | A. Sankaran, S. Mani, V. Sinha and R. Aralikatte, "A Visual Programming Paradigm for Abstract Deep Learning Model Development," *arXiv preprint ,* vol. arXiv:1905.02486, 2019. |
| [2] | A. Vaswani, N. Shazeer, N. Parmar, J. Uszkoreit, L. Jones, A. N. Gomez, L. Kaiser and I. Polosukhin, "Attention Is All You Need," in *Advances in Neural Information Processing Systems*, 2017. |
| [3] | M. Idrees and A. Repenning, "A Comprehensive Survey and Analysis of Diverse Visual Programming Languages," *VFAST Transactions on Software Engineering,* vol. 10, no. 2, pp. 47-60, 2022. |
| [4] | M. Jeon, S. Kim and H. Oh, "A Static Analyzer for Detecting Tensor Shape Errors in Deep Neural Network Training Code," *Proceedings of the ACM on Programming Languages,* vol. 4, no. OOPSLA, pp. 1-28, 2020. |
| [5] | S. Wang, "JunoBench: A Benchmark Dataset of Crashes in Python Machine Learning Jupyter Notebooks," *arXiv preprint,* vol. arXiv:2510.18013, 2025. |
| [6] | I. Goodfellow, Y. Bengio and A. Courville, Deep Learning - Chapter 9: Convolutional Networks, California: MIT Press, 2016. |
| [7] | V. Dumoulin and F. Visin, "A guide to convolution arithmetic for deep learning," *arXiv preprint,* vol. arXiv:1603.07285, 2016. |
| [8] | B. A. Myers, "Taxonomies of Visual Programming and Program Visualization," *IEEE Computer,* vol. 23, no. 3, pp. 97-105, 1990. |
| [9] | TensorFlow, "TensorBoard: TensorFlow's visualization toolkit," [Online]. Available: [https://www.tensorflow.org/tensorboard](https://www.tensorflow.org/tensorboard). [Accessed 1 July 2026]. |
| [10] | Microsoft, "Lobe: Train machine learning models with a free, easy to use app," Microsoft, 2024. [Online]. Available: [https://lobe.ai/](https://lobe.ai/). |
| [11] | KNIME Analytics Platform, "KNIME Analytics Platform," KNIME , 2026. [Online]. Available: https://www.knime.com/. [Accessed 1 July 2026]. |
| [12] | TorchStudio, "TorchStudio: An open source IDE for machine learning," 2023. [Online]. Available: https://www.torchstudio.ai/](https://www.torchstudio.ai/. |
| [13] | IBM, "IBM Watson Studio," IBM, 2026. [Online]. Available: https://www.ibm.com/products/watson-studio. [Accessed 2 July 2026]. |
| [14] | M. Isaksson and R. Lundberg, "Visual Machine Learning Modeling with PerceptiLabs," Software available from [www.perceptilabs.com](https://www.perceptilabs.com), 2020. |
| [15] | IBM Corporation, *IBM Watson Studio: Streamlining Automated Machine Learning and Visual Data Workflows,* Available via IBM Cloud documentation platforms., 2024. |

# Appendices

***Guidance —*** *Use appendices for material that supports the thesis but would interrupt the flow: long code listings, full result tables, extra figures, datasheets, or survey forms. Label them Appendix A, Appendix B, and refer to them from the main text.*

## Appendix A: [ Title ]

*[ Write your text here. ]*

# General Guidelines (Read Once Before You Start)

*The rules below apply across the whole thesis. They are reference material — they are not part of your final submission, so delete this whole section before you hand in.*

## Writing Style

* Write in clear, formal English. Short sentences beat long ones. Say one thing per sentence.
* Use the past tense for what you did (“we trained the model”) and the present tense for facts that stay true (“the ReLU function returns…”).
* Be consistent: use the same term for the same thing throughout. Do not switch between “model,” “network,” and “system” for the same object.
* Define every abbreviation the first time you use it, then use the short form.
* Avoid unsupported claims. If you state something as fact, either cite a source or show your own evidence for it.
* Do not copy text from sources. Paraphrase in your own words and cite. Plagiarism is the fastest way to fail.

## Formatting

| **Item** | **Recommended setting** |
| --- | --- |
| Page size | *A4, portrait* |
| Margins | *2.5 cm (1 inch) on all sides* |
| Body font | *Arial or Times New Roman, 11–12 pt* |
| Line spacing | *1.5 lines in body text* |
| Headings | *Bold, numbered (1, 1.1, 1.1.1)* |
| Alignment | *Justified body text* |
| Page numbers | *Bottom of every page* |
| Captions | *Below figures, above tables, numbered per chapter* |

## Figures, Tables, and Equations

* Number figures and tables per chapter: Figure 3.1, Table 5.2, and so on.
* Every figure and table must be referred to in the text before it appears, and must have a caption.
* Make sure text inside figures is readable when printed. Redraw blurry screenshots.
* Number equations on the right margin, e.g. (3.1), and refer to them as “Eq. (3.1).”
* Never paste a figure you cannot explain. If it is in the thesis, you must be able to describe it.

## Referencing (IEEE Style)

* Cite in the text with square brackets in order of appearance: “…as shown in [3].”
* Number the reference list in the order the citations first appear, not alphabetically.
* Use a reference manager (Zotero, Mendeley, or Word’s built-in tool) to keep the list consistent.
* Prefer peer-reviewed papers, books, and official documentation over blogs and forums.

***Guidance —*** *Format examples for common source types are shown in the References section above.*

## Submission Checklist

|  |
| --- |
| **Tick each item before you submit:**   * Every bracketed [ placeholder ] and grey guidance note has been removed. * Title page is complete with all names, IDs, supervisor, and date. * Table of contents has been updated (correct headings and page numbers). * Every figure and table is numbered, captioned, and referenced in the text. * Every claim is either cited or supported by your own results. * All references are in IEEE format and cited in the text in order. * Spelling and grammar checked; consistent terms used throughout. * Plagiarism / similarity check passed within the allowed limit. * Approved by your supervisor before final printing. |