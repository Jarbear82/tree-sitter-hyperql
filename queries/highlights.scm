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
(type (dotted_identifier) @type)

; Named type definitions
(node_entry_full . (dotted_identifier) @type)
(edge_entry_full . (dotted_identifier) @type)
(struct_definition . (dotted_identifier) @type)
(trait_definition  . (dotted_identifier) @type)
(view_definition . (dotted_identifier) @type)
(union_definition . (dotted_identifier) @type)
(materialized_view_definition (identifier) @type)

; Enum type names and members
(enum_entry_full . (dotted_identifier) @enum)
(enum_body (dotted_identifier) @constant)

; Union variant names
(union_variant . (identifier) @variant)

; EXTENDS targets
(extends_clause (dotted_identifier) @type)

; Type labels in patterns and CREATE
(pattern           ":" . (dotted_identifier) @type)
(create_node_entry ":" . (dotted_identifier) @type)
(create_edge_entry ":" . (dotted_identifier) @type)

; Namespace names
(namespace_body (dotted_identifier) @variable)
(schema_definition (identifier) @variable)


; ── Functions ───────────────────────────────────────────────
; Function name is the identifier immediately after the purity decorator
(function_definition           (decorator) . (identifier) @function)
(aggregate_function_definition (decorator) . (identifier) @function)

; Call sites
(function_call (dotted_identifier) @function)
(window_call   (dotted_identifier) @function)


; ── Parameters ──────────────────────────────────────────────
(parameter      (identifier) @variable.parameter)
(view_parameter "$" @punctuation.special (identifier) @variable.parameter)
(parameter_ref  "$" @punctuation.special (identifier) @variable.parameter)


; ── Properties / field names ────────────────────────────────
(node_storage_entry  . (dotted_identifier) @property)
(node_computed_entry . (dotted_identifier) @property)
(field_entry         . (dotted_identifier) @property)
(create_assignment   . (dotted_identifier) @property)
(set_assignment      . (identifier) @property)
(pattern_prop        . (dotted_identifier) @property)
(object_literal      (identifier) @property)


; ── Special variables & Built-ins ───────────────────────────
"this" @variable.special

(enum_shorthand "." @punctuation.special
                (identifier) @constant)


; ── Wildcards ────────────────────────────────────────────────
(star_arg) @operator


; ── Member / index access ────────────────────────────────────
(member_access "."  @punctuation.delimiter)
(member_access "?." @punctuation.delimiter)
(member_access (identifier) @property)

(index_access "[" @punctuation.bracket
              "]" @punctuation.bracket)


; ── Variables (catch-all) ────────────────────────────────────
(identifier) @variable


; ── Operators ────────────────────────────────────────────────
[
    "==" "!=" "<" ">" "<=" ">="
    "&&" "||" "!" "~"
    "AND" "OR" "NOT"
    "+" "-" "*" "/" "%"
    "&" "|" "??"
    "=" "+=" "-="
    "IS" "IN"
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

[
    "USER" "PASSWORD" "ROLES" "REMOVE"
    "STRICT_PERMISSIONS" "EFFECTIVE"
    "USING"
] @keyword

[ "BEGIN" "COMMIT" "ROLLBACK" "ISOLATION" "LEVEL" ] @keyword

[
    "SHOW" "PREPARED" "STATEMENTS"
    "TRAITS" "VIEWS" "FUNCTIONS"
    "REBUILD"
    "EXPLAIN" "ANALYZE"
    "VERBOSE" "JSON"
] @keyword

[
    "VAR" "CONST"
    "IF" "THEN" "ELSE"
    "CASE" "WHEN" "END"
    "WHILE" "FOR"
    "BREAK" "CONTINUE"
    "RETURN"
] @keyword

[ "PREPARE" "EXECUTE" ] @keyword
