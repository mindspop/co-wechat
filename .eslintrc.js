module.exports = {
  'parser': 'babel-eslint',
  'extends': 'airbnb/base',
  'env': {
    'es6': true,
    'node': true,
    'browser': true
  },
  'rules': {
    'semi': [2, 'never'],
    'indent': ['error', 2, {'SwitchCase': 1}],
    'strict': [0],
    'no-shadow': 'off',
    'arrow-parens': [2, 'always'],
    'no-unused-expressions': [2, {'allowShortCircuit': true, 'allowTernary': true}],
    'no-mixed-operators': [
      2,
      {
        'groups': [
          ['&', '|', '^', '~', '<<', '>>', '>>>'],
          ['==', '!=', '===', '!==', '>', '>=', '<', '<='],
          ['&&', '||'],
          ['in', 'instanceof']
        ],
        'allowSamePrecedence': true
      }
    ],
    'no-plusplus': [2, { 'allowForLoopAfterthoughts': true }],
    'class-methods-use-this': 0,
    'import/extensions': [2, { 'js': 'never' }],
    'import/no-extraneous-dependencies': 0,
    'no-console': ['error', { 'allow': ['error'] }],
    'no-param-reassign': ['error', { 'props': false }]
  },
  'globals': {
    "describe": true,
    "it": true,
    "before": true,
    "beforeEach": true,
    "after": true
  }
}
