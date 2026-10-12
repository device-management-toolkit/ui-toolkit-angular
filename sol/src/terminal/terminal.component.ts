/*********************************************************************
 * Copyright (c) Intel Corporation 2023
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/
import { Component, OnInit, input, output } from '@angular/core'
import { Terminal } from '@xterm/xterm'
@Component({
  selector: 'amt-terminal',
  templateUrl: './terminal.component.html'
})
export class TerminalComponent implements OnInit {
  readonly term = input.required<Terminal>()
  readonly handleKeyPress = output<any>()
  container: HTMLElement | null = null
  ngOnInit(): void {
    const term = this.term()
    if (term == null) throw new Error('Terminal not found')
    this.container = document.getElementById('terminal')
    if (this.container == null) throw new Error('Container not found')
    term.open(this.container)
    term.onKey(({ key, domEvent }) => {
      domEvent.preventDefault()
      if (domEvent.ctrlKey && domEvent.key === 'c') {
        const termValue = this.term()
        if (termValue.hasSelection()) {
          navigator.clipboard
            .writeText(termValue.getSelection())
            .then(() => {})
            .catch((err) => {
              console.error('Failed to copy to clipboard', err)
            })
        } else {
          // Send interrupt signal (SIGINT) to terminal
          termValue.write('\x03') // Sends Ctrl + C (ASCII code 03)
        }
        // Prevent the default browser behavior (like opening menus)
        return false
      }
      if (domEvent.ctrlKey && domEvent.key === 'v') {
        navigator.clipboard
          .readText()
          .then((text) => {
            this.handleKeyPress.emit(text)
          })
          .catch((err) => {
            console.error('Failed to read clipboard', err)
          })
        return false
      }
      this.handleKeyPress.emit(key)
    })
  }
}
