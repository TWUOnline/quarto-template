-- Filters (excluding docx)
if not FORMAT:match 'docx' then
-- The function below repurposes the Quarto native 'note' Callout.
  function Div(div)
    -- learning-activity
    if div.classes:includes("learning-activity") then
      return quarto.Callout({
        type = "note",
        content = div.content,
        title = div.attributes.title and ("Learning Activity: " .. div.attributes.title) or "Learning Activity",
        appearance = div.attributes.appearance or "default",
        icon = false
      })
    end
    -- check
    if div.classes:includes("check") then
      return quarto.Callout({
        type = "note",
        content = div.content,
        title = "Checking Your Learning",
        appearance = div.attributes.appearance or "default",
        icon = false
      })
    end
    -- note
    if div.classes:includes("note") then
      return quarto.Callout({
        type = "note",
        content = div.content,
        appearance = div.attributes.appearance or "simple",
        icon = div.attributes.icon or false
      })
    end
    -- accordion
    if div.classes:includes("accordion") then
      return quarto.Callout({
        type = "note",
        content = div.content,
        title = div.attributes.title or "Open to learn more.",
        appearance = div.attributes.appearance or "simple",
        icon = false,
        collapse = div.attributes.collapse or true
      })
    end
  end
end

-- Docx Filters
if FORMAT:match 'docx' then
  -- The function below repurposes the Quarto native 'note' Callout. For docs it requires a work-around since nested callouts are not supported.
  local in_callout = false
  local function process_div(div)
    -- learning-activity
    if div.classes:includes("learning-activity") then
      if not in_callout then
        in_callout = true
        local result = quarto.Callout({
          type = "note",
          content = pandoc.walk_block(pandoc.Div(div.content), {Div = process_div}),
          title = div.attributes.title and ("Learning Activity: " .. div.attributes.title) or "Learning Activity",
          appearance = div.attributes.appearance or "default",
          icon = div.attributes.icon or false
        })
        in_callout = false
        return result
      else
        return div
      end
    -- check
    elseif div.classes:includes("check") then
      if not in_callout then
        in_callout = true
        local result = quarto.Callout({
          type = "note",
          content = pandoc.walk_block(pandoc.Div(div.content), {Div = process_div}),
          title = "Checking Your Learning",
          appearance = div.attributes.appearance or "default",
          icon = div.attributes.icon or false
        })
        in_callout = false
        return result
      else
        return div
      end
    -- note
    elseif div.classes:includes("note") then
      if not in_callout then
        in_callout = true
        local result = quarto.Callout({
          type = "note",
          content = pandoc.walk_block(pandoc.Div(div.content), {Div = process_div}),
          appearance = div.attributes.appearance or "simple",
          icon = div.attributes.icon or false
        })
        in_callout = false
        return result
      else
        return div
      end
    -- accordion
    elseif div.classes:includes("accordion") then
      if not in_callout then
        in_callout = true
        local result = quarto.Callout({
          type = "note",
          content = pandoc.walk_block(pandoc.Div(div.content), {Div = process_div}),
          title = div.attributes.title or "Open to learn more.",
          appearance = div.attributes.appearance or "simple",
          icon = div.attributes.icon or false
        })
        in_callout = false
        return result
    else
      return div
    end
    else
      return pandoc.walk_block(div, {Div = process_div})
    end
  end
  function Div(div)
    return process_div(div)
  end
  -- remove bookmarks from headings  
  function Header(el)
    el.identifier = ""
    return el
  end
end