import type { Task } from '@/features/admin/taskModel';

/**
 * Builder for `ToDo` rows as Supabase returns them, so /admin specs never
 * depend on the live table. Chainable, like the menu builders.
 */
export class TaskBuilder {
  private task: Task;

  constructor(title = 'A job') {
    this.task = {
      id: fakeUuid(title),
      title,
      completed: false,
      important: false,
      pinned: false,
      area: 'buying',
      priority: 'next',
      section: null,
      assignee: null,
      position: 0,
      created_at: '2026-08-01T09:00:00.000Z',
      updated_at: null,
    };
  }

  in(area: string): this {
    this.task.area = area;
    return this;
  }

  at(priority: string): this {
    this.task.priority = priority;
    return this;
  }

  under(section: string): this {
    this.task.section = section;
    return this;
  }

  assignedTo(assignee: string): this {
    this.task.assignee = assignee;
    return this;
  }

  starred(): this {
    this.task.important = true;
    return this;
  }

  pinned(): this {
    this.task.pinned = true;
    return this;
  }

  done(): this {
    this.task.completed = true;
    return this;
  }

  position(position: number): this {
    this.task.position = position;
    return this;
  }

  build(): Task {
    return { ...this.task };
  }
}

/** A board with one job per case the specs care about. */
export function testBoardTasks(): Task[] {
  return [
    new TaskBuilder('Get the AC sorted').in('shop').at('block').position(1).build(),
    new TaskBuilder('Buy bowls and plates').in('buying').at('block').starred().position(2).build(),
    new TaskBuilder('Add a photo to every item in Square')
      .in('tech')
      .at('block')
      .under('Square')
      .position(3)
      .build(),
    new TaskBuilder('Branded fans').in('design').at('next').pinned().starred().position(4).build(),
    new TaskBuilder('Rubbish bin for outside').in('buying').at('next').position(5).build(),
    new TaskBuilder('Image / video loop for the TV').in('content').at('later').position(6).build(),
    new TaskBuilder('Clean the outside terrace').in('shop').at('next').done().position(7).build(),
  ];
}

/** Stable pseudo-uuid so failures point at a recognisable row. */
function fakeUuid(seed: string): string {
  const hex = Array.from(seed)
    .reduce((acc, char) => (acc * 33 + char.charCodeAt(0)) >>> 0, 5381)
    .toString(16)
    .padStart(8, '0');
  return `${hex}-0000-4000-8000-000000000000`;
}
