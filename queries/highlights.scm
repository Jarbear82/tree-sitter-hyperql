; ── Comments ────────────────────────────────────────────────
(comment) @comment


; ── Literals ────────────────────────────────────────────────
(string)  @string
(number)  @number
(boolean) @boolean
"null"    @constant.builtin


; ── Decorators ──────────────────────────────────────────────
(decorator) @attribute


; ── Types ───────────────────────────────────────────────────
(primitive_type) @type.builtin

; Generic and plain type references — type's first child is dotted_identifier
(type (dotted_identifier) @type)

; Named type definitions — all names are dotted_identifier, anchor to first named child
(node_entry_full . (dotted_identifier) @type)
(edge_entry_full . (dotted_identifier) @type)
(struct_definition . (dotted_identifier) @type)
(trait_definition  . (dotted_identifier) @type)

; Enum type names and members
(enum_entry_full . (dotted_identifier) @type)
(enum_body (dotted_identifier) @constant)

; Union variant names (v0.20: new union_definition / union_variant rules)
(union_variant . (identifier) @type)

; EXTENDS targets
(extends_clause (dotted_identifier) @type)

; Type labels in patterns and CREATE — capture the dotted_identifier immediately after ':'
(pattern           ":" . (dotted_identifier) @type)
(create_node_entry ":" . (dotted_identifier) @type)
(create_edge_entry ":" . (dotted_identifier) @type)

; Namespace names
(namespace_body (dotted_identifier) @variable)


; ── Functions ───────────────────────────────────────────────
; Function name is the identifier immediately after the purity decorator
(function_definition           (decorator) . (identifier) @function)
(aggregate_function_definition (decorator) . (identifier) @function)

; Call sites use dotted_identifier (e.g. math.abs(...), OVER(...))
(function_call (dotted_identifier) @function)
(window_call   (dotted_identifier) @function)


; ── Parameters ──────────────────────────────────────────────
(parameter      (identifier) @variable.parameter)
; view_parameter: "$" identifier ":" type — highlight both the sigil and the name
(view_parameter "$" @punctuation.special (identifier) @variable.parameter)
(parameter_ref  "$" @punctuation.special (identifier) @variable.parameter)


; ── Properties / field names ────────────────────────────────
; Anchor to first named child so only the field name is captured, not body contents
(node_storage_entry  . (dotted_identifier) @property)
(node_computed_entry . (dotted_identifier) @property)
(field_entry         . (dotted_identifier) @property)
(create_assignment   . (dotted_identifier) @property)
; set_assignment first form starts with a bare identifier (second form with member_access)
(set_assignment      . (identifier) @property)
(pattern_prop        . (dotted_identifier) @property)
; object_literal keys are bare identifier nodes, direct children of the rule
(object_literal (identifier) @property)


; ── Special variables ────────────────────────────────────────
"this" @variable.special

(enum_shorthand "." @punctuation.special
                (identifier) @constant.builtin)


; ── Wildcards ────────────────────────────────────────────────
(star_arg) @operator


; ── Member / index access ────────────────────────────────────
(member_access "."  @punctuation.delimiter)
(member_access "?." @punctuation.delimiter)
(member_access (identifier) @property)

(index_access "[" @punctuation.bracket
              "]" @punctuation.bracket)


; ── Variables (catch-all, must stay last in this section) ────
(identifier) @variable


; ── Operators ────────────────────────────────────────────────
[
  "==" "!=" "<" ">" "<=" ">="
  "&&" "||" "!" "~"
  "AND" "OR"
  "+" "-" "*" "/" "%"
  "&" "|" "??"
  "=" "+=" "-="
  "IS" "NOT" "IN"
  "LIKE" "ILIKE" "MATCHES" "IMATCHES"
] @operator

; Directional / arrow operators
[ "->" "<-" "<->" "=>" ] @operator

; Nullability marker on types
(type "?" @operator)

; Cardinality wildcards and ranges
(cardinality "*"  @operator)
(cardinality ".." @operator)


; ── Punctuation ──────────────────────────────────────────────
[ "(" ")" "[" "]" "{" "}" ] @punctuation.bracket
[ "," ";"                 ] @punctuation.delimiter
[ ":"                     ] @punctuation.delimiter


; ── Keywords ────────────────────────────────────────────────
; SDL / schema definition
[
  "DEFINE" "ABSTRACT"
  "IF" "EXISTS"
  "NAMESPACE" "SCHEMA"
  "FIELD" "STRUCT" "TRAIT"
  "NODE" "EDGE"
  "ENUM" "UNION"
  "FUNCTION" "AGGREGATE"
  "INDEX" "MATERIALIZED" "VIEW"
  "EXTENDS" "ALLOWS"
  "DEFAULT"
  "STATE" "ACCUMULATE" "FINALIZE"
  "ACCESS" "ROLE" "POLICY"
  "IMPORT"
] @keyword

; Query pipeline
[
  "MATCH" "OPTIONAL"
  "WHERE"
  "WITH" "AS"
  "RETURN" "DISTINCT"
  "GROUP" "BY"
  "HAVING"
  "ORDER" "ASC" "DESC" "NULLS" "FIRST" "LAST"
  "LIMIT" "SKIP"
  "ALL"
  "CROSS_TYPE"
  "PATH" "FROM"
  "OVER" "PARTITION"
  "ROWS" "RANGE" "BETWEEN"
  "CURRENT" "ROW"
  "UNBOUNDED" "PRECEDING" "FOLLOWING"
] @keyword

; DML / mutations
[
  "CREATE" "MERGE" "SET" "DELETE" "DETACH"
  "ALTER" "DROP" "ADD" "RENAME" "TO"
  "MIGRATE" "VALIDATE"
  "GRANT" "DENY" "REVOKE"
  "CONSTRAINT"
  "ON" "FOR"
  "PERMISSIONS" "CASCADE" "NO"
  "OBJECT" "UDF"
] @keyword

; Auth / user management
[
  "USER" "PASSWORD" "ROLES" "REMOVE"
  "STRICT_PERMISSIONS" "EFFECTIVE"
  "USING"
] @keyword

; Transactions
[ "BEGIN" "COMMIT" "ROLLBACK" "ISOLATION" "LEVEL" ] @keyword

; Introspection (v0.20: REBUILD, ANALYZE, EXPLAIN, TRAITS, VIEWS, FUNCTIONS added)
[
  "SHOW" "PREPARED" "STATEMENTS"
  "TRAITS" "VIEWS" "FUNCTIONS"
  "REBUILD"
  "EXPLAIN" "ANALYZE"
  "VERBOSE" "JSON"
] @keyword

; Scripting / control flow
[
  "VAR" "CONST"
  "IF" "THEN" "ELSE"
  "CASE" "WHEN" "END"
  "WHILE" "FOR"
  "BREAK" "CONTINUE"
  "RETURN"
  "EXISTS"
  "NULL"
] @keyword

; Prepared statements (v0.20: PERSISTENT removed)
[ "PREPARE" "EXECUTE" ] @keyword
