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

; Generic and plain type references
(type (identifier) @type)

; Named type definitions
(node_definition   (node_entry_full (identifier) @type .))
(edge_definition   (edge_entry_full (identifier) @type .))
(struct_definition (identifier) @type .)
(trait_definition  (identifier) @type .)

; Enum type names and members
(enum_definition (enum_entry_full (identifier) @type .))
(enum_body (identifier) @constant)

; Role names
(role_definition (role_entry_full (identifier) @type .))

; EXTENDS targets
(extends_clause (identifier) @type)

; Type labels in patterns and CREATE — second identifier is the type
(pattern         (identifier) (identifier) @type)
(create_node_entry (identifier) (identifier) @type)
(create_edge_entry (identifier) (identifier) @type)

; Namespace names
(namespace_body (dotted_identifier) @variable)


; ── Functions ───────────────────────────────────────────────
(function_definition           (identifier) @function .)
(aggregate_function_definition (identifier) @function .)
(function_call                 (identifier) @function.call)
(window_call                   (identifier) @function.call)


; ── Parameters ──────────────────────────────────────────────
(parameter     (identifier) @variable.parameter)
(parameter_ref "$" @punctuation.special
               (identifier) @variable.parameter)


; ── Properties / field names ────────────────────────────────
(node_storage_entry (identifier) @property)
(node_computed_entry (identifier) @property)
(field_entry     (identifier) @property .)
(create_assignment (identifier) @property .)
(set_assignment  (identifier) @property .)
(pattern_prop    (identifier) @property .)
(object_literal  (identifier) @property .)


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


; ── Variables (catch-all, must stay last) ────────────────────
(identifier) @variable


; ── Operators ────────────────────────────────────────────────
[
  "==" "!=" "<" ">" "<=" ">="
  "&&" "||" "!" "~"
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
  "NAMESPACE" "SCHEMA"
  "FIELD" "STRUCT" "TRAIT"
  "NODE" "EDGE"
  "ENUM" "ROLE"
  "FUNCTION" "AGGREGATE"
  "INDEX" "MATERIALIZED" "VIEW"
  "EXTENDS" "ALLOWS"
  "DEFAULT"
  "STATE" "ACCUMULATE" "FINALIZE"
  "ACCESS" "POLICY"
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
  "UNION" "ALL"
  "CROSS_TYPE"
  "PATH"
  "OVER" "PARTITION"
  "ROWS" "RANGE" "BETWEEN" "AND"
  "UNBOUNDED" "PRECEDING" "FOLLOWING"
] @keyword

; DML / mutations
[
  "CREATE" "MERGE" "SET" "DELETE" "DETACH"
  "ALTER" "DROP" "ADD" "RENAME" "TO"
  "MIGRATE" "VALIDATE"
  "GRANT" "DENY" "REVOKE"
  "CONSTRAINT"
  "ON" "FOR" "FROM"
  "PERMISSIONS" "CASCADE"
  "OBJECT"
] @keyword

; Auth / user management
[
  "USER" "PASSWORD" "ROLES" "REMOVE"
  "STRICT_PERMISSIONS" "EFFECTIVE"
] @keyword

; Transactions
[ "BEGIN" "COMMIT" "ROLLBACK" "ISOLATION" "LEVEL" ] @keyword

; Introspection
[ "SHOW" "PREPARED" "STATEMENTS" ] @keyword

; Scripting / control flow
[
  "VAR" "CONST"
  "IF" "THEN" "ELSE"
  "CASE" "WHEN" "END"
  "WHILE" "FOR" "IN"
  "BREAK" "CONTINUE"
  "RETURN"
  "EXISTS"
  "NULL" "IS" "NOT"
] @keyword

; Prepared statements
[ "PREPARE" "PERSISTENT" "EXECUTE" ] @keyword
