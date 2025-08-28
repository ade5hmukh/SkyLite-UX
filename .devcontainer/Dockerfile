FROM node:20

# Install basic development tools
RUN apt update && apt install -y less man-db sudo

# Ensure default `node` user has access to `sudo`
ARG USERNAME=node
RUN echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

# Set `DEVCONTAINER` environment variable to help with orientation
ENV DEVCONTAINER=true

# Set log level using environment variable
# Options: error, warn, info, verbose, debug
# - error: Only show errors
# - warn: Show warnings and errors
# - info: Show info, warnings, and errors (default)
# - verbose: Show verbose, info, warnings, and errors
# - debug: Show all log levels including debug
# ENV NUXT_LOG_LEVEL=debug

# listen on all interfaces inside the container
ENV HOST=0.0.0.0
