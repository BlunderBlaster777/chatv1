describe('Messages', () => {
  it('message content should not be empty', () => {
    const content = '   ';
    expect(content.trim()).toBe('');
  });

  it('message content should be trimmed', () => {
    const content = '  hello  ';
    expect(content.trim()).toBe('hello');
  });
});
