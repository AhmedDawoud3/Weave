# Components

## Pages

### `SplashPage`
Animated brand splash screen displayed on initial load.

- **Props**: None
- **File**: [`src/pages/SplashPage.tsx`](../src/pages/SplashPage.tsx)

### `LoginPage`
Authentication screen with email/password fields and social login buttons.

| Prop     | Type         | Description              |
|----------|--------------|--------------------------|
| onLogin  | `() => void` | Called on login/register |

- **File**: [`src/pages/LoginPage.tsx`](../src/pages/LoginPage.tsx)

### `DashboardPage`
Project listing grid with create, open, and delete actions.

| Prop            | Type                      | Description              |
|-----------------|---------------------------|--------------------------|
| projects        | `Project[]`               | List of saved projects   |
| onAddProject    | `() => void`              | Create new project       |
| onOpenProject   | `() => void`              | Open selected project    |
| onDeleteProject | `(id: number) => void`    | Delete a project         |

- **File**: [`src/pages/DashboardPage.tsx`](../src/pages/DashboardPage.tsx)

### `StudioPage`
Main visual canvas workspace with ReactFlow graph editor.

| Prop                  | Type         | Description                    |
|-----------------------|--------------|--------------------------------|
| onNavigateDashboard   | `() => void` | Navigate back to dashboard     |

- **File**: [`src/pages/StudioPage.tsx`](../src/pages/StudioPage.tsx)

## Components

### `Sidebar`
Collapsible palette of draggable layer types. Users drag items onto the canvas to create nodes.

| Prop                | Type         | Description                   |
|---------------------|--------------|-------------------------------|
| onNavigateDashboard | `() => void` | Navigate back to dashboard    |

- **File**: [`src/components/Sidebar.tsx`](../src/components/Sidebar.tsx)
- **Layer types**: `CONV2D`, `LINEAR`, `DROPOUT` (from `LAYER_TYPES` constant)

### `PropertiesPanel`
Inspector panel displayed when a node is selected on the canvas. Shows configurable parameters (units, activation) and a remove button.

| Prop              | Type                                  | Description                 |
|-------------------|---------------------------------------|-----------------------------|
| selectedNode      | `Node<NodeData> \| undefined`         | Currently selected node     |
| selectedNodeId    | `string \| null`                      | ID of selected node         |
| onUpdateNodeParams| `(nodeId: string, params) => void`    | Update node parameters      |
| onRemoveNode      | `(nodeId: string) => void`            | Remove node from canvas     |

- **File**: [`src/components/PropertiesPanel.tsx`](../src/components/PropertiesPanel.tsx)

### `LayerNode`
Custom ReactFlow node component that renders a layer card with handle connections.

- **Props**: `NodeProps<NodeData>` (standard ReactFlow node props)
- **File**: [`src/components/LayerNode.tsx`](../src/components/LayerNode.tsx)
- **Data shape**:

```typescript
interface NodeData {
  type: LayerType;
  label?: string;
  params: LayerParams;
}
```

## UI Primitives (shadcn/ui)

Located in [`src/components/ui/`](../src/components/ui/):

| Component       | Usage                          |
|-----------------|--------------------------------|
| `button.tsx`    | Action buttons (sidebar, panel)|
| `card.tsx`      | Layer node wrapper             |
| `input.tsx`     | Login form fields              |
| `label.tsx`     | Form labels                    |
| `select.tsx`    | Activation function dropdown   |
| `separator.tsx` | Visual dividers                |

## Utility

### `cn()`

Class name utility combining `clsx` and `tailwind-merge`. Used throughout components for conditional styling.

```typescript
import { cn } from "@/lib/utils";
cn("px-4", "py-2", condition && "hidden");
```

- **File**: [`src/lib/utils.ts`](../src/lib/utils.ts)
