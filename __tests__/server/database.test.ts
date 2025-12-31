import { describe, it, expect } from '@jest/globals';
import { prisma } from '../setup';

describe('Database CRUD Operations', () => {
  it('should create a user', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: 'hashedpassword',
        username: 'testuser',
      },
    });

    expect(user).toBeDefined();
    expect(user.email).toBe('test@example.com');
    expect(user.username).toBe('testuser');
    expect(user.id).toBeDefined();
  });

  it('should create a note', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'noteuser@example.com',
        password: 'hashedpassword',
      },
    });

    const note = await prisma.note.create({
      data: {
        content: 'Test note content',
        color: '#fef3c7',
        x: 100,
        y: 200,
        width: 200,
        height: 200,
        userId: user.id,
      },
    });

    expect(note).toBeDefined();
    expect(note.content).toBe('Test note content');
    expect(note.userId).toBe(user.id);
    expect(note.x).toBe(100);
    expect(note.y).toBe(200);
  });

  it('should read a user', async () => {
    const createdUser = await prisma.user.create({
      data: {
        email: 'readuser@example.com',
        password: 'hashedpassword',
      },
    });

    const foundUser = await prisma.user.findUnique({
      where: { id: createdUser.id },
    });

    expect(foundUser).toBeDefined();
    expect(foundUser?.email).toBe('readuser@example.com');
  });

  it('should update a note', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'updateuser@example.com',
        password: 'hashedpassword',
      },
    });

    const note = await prisma.note.create({
      data: {
        content: 'Original content',
        userId: user.id,
      },
    });

    const updatedNote = await prisma.note.update({
      where: { id: note.id },
      data: { content: 'Updated content' },
    });

    expect(updatedNote.content).toBe('Updated content');
  });

  it('should delete a note', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'deleteuser@example.com',
        password: 'hashedpassword',
      },
    });

    const note = await prisma.note.create({
      data: {
        content: 'To be deleted',
        userId: user.id,
      },
    });

    await prisma.note.delete({
      where: { id: note.id },
    });

    const deletedNote = await prisma.note.findUnique({
      where: { id: note.id },
    });

    expect(deletedNote).toBeNull();
  });

  it('should create a reaction', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'reactionuser@example.com',
        password: 'hashedpassword',
      },
    });

    const note = await prisma.note.create({
      data: {
        content: 'Note with reaction',
        userId: user.id,
      },
    });

    const reaction = await prisma.reaction.create({
      data: {
        emoji: '👍',
        noteId: note.id,
        userId: user.id,
      },
    });

    expect(reaction).toBeDefined();
    expect(reaction.emoji).toBe('👍');
    expect(reaction.noteId).toBe(note.id);
    expect(reaction.userId).toBe(user.id);
  });
});

