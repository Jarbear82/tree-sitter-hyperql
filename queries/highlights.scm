; ── Comments ────────────────────────────────────────────────
(comment) @comment


; ── Literals ────────────────────────────────────────────────
(string)  @string
(number)  @number
(boolean) @boolean
"null"    @constant.builtin
; (escape_sequence) @string.escape ; Not Working!


; ── Decorators ──────────────────────────────────────────────
(decorator) @attribute


; ── General Identifiers (Catch-all) ─────────────────────────
; This must come BEFORE specific identifier captures so they can override it
(identifier) @variable


; ── Graph Roles & Relationships ────────────────────────────
; Colors the left-hand side of roles: husband, friend, owner
(role_entry (dotted_identifier (identifier) @property))

; ── Types ──────────────────────────────────────────────────
; Colors the types targeted in an ALLOWS clause: Person, Dog
(inline_allows_clause (dotted_identifier (identifier) @type))
(primitive_type) @type.builtin

; Match any identifier within a type rule as a type
(type (dotted_identifier (identifier) @type))
(type (dotted_identifier) @type)

; Named type definitions
(node_entry_full . (dotted_identifier (identifier) @type))
(edge_entry_full . (dotted_identifier (identifier) @type))
(struct_definition . (dotted_identifier (identifier) @type))
(trait_definition  . (dotted_identifier (identifier) @type))

; Enum type names (e.g., Priority)
(enum_entry_full . (dotted_identifier (identifier) @enum)) ; Using Zed's @enum
(enum_entry_full "<" @punctuation.bracket)
(enum_entry_full (primitive_type) @type.builtin)
(enum_entry_full ">" @punctuation.bracket)

; Enum members / variants (e.g., LOW, MEDIUM, HIGH)
(enum_body (dotted_identifier (identifier) @variant))      ; Using Zed's @variant

; Union variant names
(union_variant (identifier) @type)

; EXTENDS targets
(extends_clause (dotted_identifier (identifier) @type))

; Type labels in patterns and CREATE
(pattern           ":" . (dotted_identifier (identifier) @label))
(create_node_entry ":" . (dotted_identifier (identifier) @label))
(create_edge_entry ":" . (dotted_identifier (identifier) @label))


; ── Functions ───────────────────────────────────────────────
; Function name in definition
(function_definition           (identifier) @function)
(aggregate_function_definition (identifier) @function)

; Call sites
(function_call (dotted_identifier (identifier) @function))
(function_call (dotted_identifier) @function)
(window_call   (dotted_identifier (identifier) @function))


; ── Parameters ──────────────────────────────────────────────
(parameter      (identifier) @variable.parameter)
(view_parameter "$" @punctuation.special (identifier) @variable.parameter)
(parameter_ref  "$" @punctuation.special (identifier) @variable.parameter)

; ── Properties & Shorthands ────────────────────────────────
; Fixes the orange shorthand properties: .gender, .age, .husband
(enum_shorthand "." @punctuation.special
                (identifier) @property)


; ── Properties / field names ────────────────────────────────
(node_storage_entry  (dotted_identifier (identifier) @property))
(node_computed_entry (dotted_identifier (identifier) @property))
(field_entry         (dotted_identifier (identifier) @property))
(create_assignment   (dotted_identifier (identifier) @property))
(set_assignment      (identifier) @property)
(pattern_prop        (dotted_identifier (identifier) @property))

; ── Properties / Object Keys ────────────────────────────────
(object_literal (identifier) @property)
(constraint_object (identifier) @property)

; Namespace names
(namespace_body (dotted_identifier (identifier) @variable.member))

; ── Scripting Variables ─────────────────────────────────────
(const_decl (identifier) @constant)
(var_decl (identifier) @variable)


; ── Special variables ────────────────────────────────────────
"this" @variable.special

; ── Wildcards ────────────────────────────────────────────────
(star_arg) @operator


; ── Member / index access ────────────────────────────────────
(member_access "."  @punctuation.delimiter)
(member_access "?." @punctuation.delimiter)
(member_access (identifier) @property)

(index_access "[" @punctuation.bracket
              "]" @punctuation.bracket)


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

; Introspection
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

; Prepared statements
[ "PREPARE" "EXECUTE" ] @keyword
