import React from "react"
import parse, {
  attributesToProps,
  Element,
} from "html-react-parser"
import Script from "next/script"

const supportedHeadElements = new Set([
  "base",
  "link",
  "meta",
  "noscript",
  "style",
  "title",
])

export function renderHeadCustomCode(html, slot) {
  if (!html) return null

  let scriptIndex = 0
  const options = {
    replace(domNode) {
      if (domNode instanceof Element && domNode.name === "script") {
        const props = attributesToProps(domNode.attribs)
        const id = props.id || `figma-custom-code-${slot}-${scriptIndex}`
        scriptIndex += 1
        const contents = domNode.children
          .map((child) => (child.type === "text" ? child.data : ""))
          .join("")
        const scriptContents = contents.trim() ? contents : undefined

        return (
          <Script {...props} id={id} strategy="afterInteractive">
            {scriptContents}
          </Script>
        )
      }

      if (domNode.parent && domNode.parent.type !== "root") return
      if (
        domNode instanceof Element &&
        supportedHeadElements.has(domNode.name)
      ) {
        return
      }

      return null
    },
  }

  return <>{parse(html, options)}</>
}

export function BodyCustomCode({ html, position }) {
  if (!html) return null

  let scriptIndex = 0
  const options = {
    replace(domNode) {
      if (domNode instanceof Element && domNode.name === "script") {
        const props = attributesToProps(domNode.attribs)
        const id = props.id || `figma-custom-code-body-${position}-${scriptIndex}`
        scriptIndex += 1
        const contents = domNode.children
          .map((child) => (child.type === "text" ? child.data : ""))
          .join("")
        const scriptContents = contents.trim() ? contents : undefined

        return (
          <Script {...props} id={id} strategy="afterInteractive">
            {scriptContents}
          </Script>
        )
      }
    },
  }

  return <>{parse(html, options)}</>
}
