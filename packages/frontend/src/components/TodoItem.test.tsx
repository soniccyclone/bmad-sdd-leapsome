import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppContextProvider } from '../context/AppContext.js';
import { TodoItem } from './TodoItem.js';

// Track mutation mocks
const toggleMutateMock = vi.fn();
const deleteMutateMock = vi.fn();
const updateDescriptionMutateMock = vi.fn();

vi.mock('../hooks/useToggleTodo.js', () => ({
  useToggleTodo: () => ({
    mutate: toggleMutateMock,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

vi.mock('../hooks/useDeleteTodo.js', () => ({
  useDeleteTodo: () => ({
    mutate: deleteMutateMock,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

vi.mock('../hooks/useUpdateDescription.js', () => ({
  useUpdateDescription: () => ({
    mutate: updateDescriptionMutateMock,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

const mockTodo = {
  id: 'todo-1',
  description: 'Buy groceries',
  completed: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockCompletedTodo = {
  id: 'todo-2',
  description: 'Walk the dog',
  completed: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AppContextProvider>{ui}</AppContextProvider>
    </QueryClientProvider>,
  );
}

describe('TodoItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders description text', () => {
    renderWithProviders(<TodoItem todo={mockTodo} />);
    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
  });

  it('renders checkbox unchecked for active todo', () => {
    renderWithProviders(<TodoItem todo={mockTodo} />);
    const checkbox = screen.getByRole('checkbox', {
      name: /mark "Buy groceries" as complete/i,
    });
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it('renders checkbox checked for completed todo', () => {
    renderWithProviders(<TodoItem todo={mockCompletedTodo} />);
    const checkbox = screen.getByRole('checkbox', {
      name: /mark "Walk the dog" as incomplete/i,
    });
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toBeChecked();
  });

  it('completed todo has strikethrough styling', () => {
    renderWithProviders(<TodoItem todo={mockCompletedTodo} />);
    const description = screen.getByText('Walk the dog');
    expect(description.className).toContain('completed');
  });

  it('active todo does not have strikethrough styling', () => {
    renderWithProviders(<TodoItem todo={mockTodo} />);
    const description = screen.getByText('Buy groceries');
    expect(description.className).not.toContain('completed');
  });

  it('clicking delete button calls delete mutation', () => {
    renderWithProviders(<TodoItem todo={mockTodo} />);
    const deleteButton = screen.getByRole('button', {
      name: /delete "Buy groceries"/i,
    });
    fireEvent.click(deleteButton);
    expect(deleteMutateMock).toHaveBeenCalledTimes(1);
    expect(deleteMutateMock).toHaveBeenCalledWith({ id: 'todo-1' });
  });

  it('clicking checkbox calls toggle mutation', () => {
    renderWithProviders(<TodoItem todo={mockTodo} />);
    const checkbox = screen.getByRole('checkbox', {
      name: /mark "Buy groceries" as complete/i,
    });
    fireEvent.click(checkbox);
    expect(toggleMutateMock).toHaveBeenCalledTimes(1);
    expect(toggleMutateMock).toHaveBeenCalledWith({
      id: 'todo-1',
      completed: true,
    });
  });

  it('clicking description enters edit mode', () => {
    renderWithProviders(<TodoItem todo={mockTodo} />);
    const description = screen.getByText('Buy groceries');
    fireEvent.click(description);
    const input = screen.getByRole('textbox', {
      name: /edit description for "Buy groceries"/i,
    });
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('Buy groceries');
  });

  it('pressing Enter in edit mode saves the edit', () => {
    renderWithProviders(<TodoItem todo={mockTodo} />);
    const description = screen.getByText('Buy groceries');
    fireEvent.click(description);
    const input = screen.getByRole('textbox', {
      name: /edit description for "Buy groceries"/i,
    });
    fireEvent.change(input, { target: { value: 'Buy vegetables' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(updateDescriptionMutateMock).toHaveBeenCalledWith({
      id: 'todo-1',
      description: 'Buy vegetables',
    });
  });

  it('pressing Escape in edit mode cancels the edit', () => {
    renderWithProviders(<TodoItem todo={mockTodo} />);
    const description = screen.getByText('Buy groceries');
    fireEvent.click(description);
    const input = screen.getByRole('textbox', {
      name: /edit description for "Buy groceries"/i,
    });
    fireEvent.change(input, { target: { value: 'Buy vegetables' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    // Should exit edit mode without calling mutate
    expect(updateDescriptionMutateMock).not.toHaveBeenCalled();
    // Description should still be original text
    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
  });

  it('does not call update when description is unchanged', () => {
    renderWithProviders(<TodoItem todo={mockTodo} />);
    const description = screen.getByText('Buy groceries');
    fireEvent.click(description);
    const input = screen.getByRole('textbox', {
      name: /edit description for "Buy groceries"/i,
    });
    // Submit without changing value
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(updateDescriptionMutateMock).not.toHaveBeenCalled();
  });

  it('renders a listitem role', () => {
    renderWithProviders(<TodoItem todo={mockTodo} />);
    expect(screen.getByRole('listitem')).toBeInTheDocument();
  });
});
