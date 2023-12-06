import { Content, Text } from 'mdast'
import { capitalizedWords } from '../config/words'
import { ErrorSeverity, FixReplace, LintError, LintRule, error } from '.'

function headingsSentenceCaseCheck(node: Content, file: string) {
  if (!('children' in node)) {
    return []
  }

  const textNode = node.children[0]
  // need to account for `inlineCode` children, in initial, middle, and final positions
  if (textNode?.type !== 'text') {
    return []
  }
  const text = textNode.value

  const errors: LintError[] = []

  const wordRegex = /\b\S+\b/g

  const firstWord = wordRegex.exec(text)?.[0]
  if (firstWord?.[0] && /[a-z]/.test(firstWord[0])) {
    errors.push(
      error({
        message: 'First word in heading should be capitalized.',
        severity: ErrorSeverity.Error,
        file,
        line: textNode.position.start.line,
        column: textNode.position.start.column,
        fix: new FixReplace({
          start: {
            line: textNode.position.start.line,
            column: textNode.position.start.column,
          },
          end: {
            line: textNode.position.start.line,
            column: textNode.position.start.column + 1,
          },
          text: firstWord[0].toUpperCase(),
        }),
      })
    )
  }

  let currMatch: RegExpExecArray
  while ((currMatch = wordRegex.exec(text)) !== null) {
    const currWord = currMatch[0]
    const index = textNode.position.start.column + currMatch.index

    if (text[currMatch.index - 2] === ':') {
      if (currWord[0] && /[a-z]/.test(currWord[0])) {
        errors.push(
          error({
            message: 'First word after colon should be capitalized.',
            severity: ErrorSeverity.Error,
            file,
            line: textNode.position.start.line,
            column: textNode.position.start.column,
            fix: new FixReplace({
              start: {
                line: textNode.position.start.line,
                column: textNode.position.start.column,
              },
              end: {
                line: textNode.position.start.line,
                column: textNode.position.start.column + 1,
              },
              text: firstWord[0].toUpperCase(),
            }),
          })
        )
      }
    } else if (
      /[A-Z]/.test(currWord[0]) &&
      capitalizedWords.matchException({
        word: currWord,
        fullString: text,
        index: currMatch.index,
      }).exception
    ) {
      wordRegex.lastIndex += capitalizedWords.matchException({
        word: currWord,
        fullString: text,
        index: currMatch.index,
      }).advanceIndexBy
    } else if (
      /[A-Z]/.test(currWord[0]) &&
      !capitalizedWords.matchException({
        word: currWord,
        fullString: text,
        index: currMatch.index,
      }).exception
    ) {
      errors.push(
        error({
          message: 'Heading should be in sentence case.',
          severity: ErrorSeverity.Error,
          file,
          line: textNode.position.start.line,
          column: textNode.position.start.column,
          fix: new FixReplace({
            start: {
              line: textNode.position.start.line,
              column: index,
            },
            end: {
              line: textNode.position.start.line,
              column: index + 1,
            },
            text: currWord[0].toLowerCase(),
          }),
        })
      )
    }
  }

  return errors
}

export function headingsSentenceCase() {
  return new LintRule({
    check: headingsSentenceCaseCheck,
    nodeTypes: 'heading',
  })
}
