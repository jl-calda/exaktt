// src/components/doc-builder/tiptap/extensions.ts
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import TiptapImage from '@tiptap/extension-image'
import FontFamily from '@tiptap/extension-font-family'
import { TextStyle } from '@tiptap/extension-text-style'

export const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
  }),
  TextAlign.configure({
    types: ['heading', 'paragraph'],
  }),
  Underline,
  TiptapImage.configure({
    inline: false,
    allowBase64: true,
  }),
  TextStyle,
  FontFamily.configure({
    types: ['textStyle'],
  }),
]
