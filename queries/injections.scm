; Inject Regex highlighting inside @pattern("...") decorators
(decorator
  (expression
    (primary_expression
      (literal
        (string) @injection.content)))
) @_dec
(#match? @_dec "^@pattern")
(#set! injection.language "regex")
