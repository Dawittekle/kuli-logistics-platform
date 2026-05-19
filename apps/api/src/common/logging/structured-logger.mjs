export const createRequestLogger = ({ service = '@kuli/api', env = 'development' } = {}) => ({
  info(event, metadata = {}) {
    console.log(
      JSON.stringify({
        level: 'info',
        service,
        env,
        event,
        ...metadata
      })
    );
  },
  error(event, metadata = {}) {
    console.error(
      JSON.stringify({
        level: 'error',
        service,
        env,
        event,
        ...metadata
      })
    );
  }
});
